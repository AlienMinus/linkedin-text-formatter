// =====================================================
// LinkedIn Unicode Formatter
// Part 1 - Core
// =====================================================

// ------------------------------
// DOM
// ------------------------------

const editor = document.getElementById("editor");
const preview = document.getElementById("preview");

const copyBtn = document.getElementById("copyBtn");
const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");
const clearBtn = document.getElementById("clearBtn");

const charCount = document.getElementById("charCount");
const wordCount = document.getElementById("wordCount");
const progressBar = document.getElementById("progressBar");
const selectionInfo = document.getElementById("selectionInfo");

const MAX_CHAR = 3000;


// ------------------------------
// History
// ------------------------------

let history = [];
let historyIndex = -1;


// ------------------------------
// Save History
// ------------------------------

function saveHistory() {

    if (historyIndex >= 0) {

        if (history[historyIndex] === editor.value)
            return;

    }

    history = history.slice(0, historyIndex + 1);

    history.push(editor.value);

    historyIndex++;

}


// ------------------------------
// Undo
// ------------------------------

function undo() {

    if (historyIndex <= 0)
        return;

    historyIndex--;

    editor.value = history[historyIndex];

    render();

}


// ------------------------------
// Redo
// ------------------------------

function redo() {

    if (historyIndex >= history.length - 1)
        return;

    historyIndex++;

    editor.value = history[historyIndex];

    render();

}



// ------------------------------
// Stats
// ------------------------------

function updateStats() {

    const text = editor.value;

    charCount.textContent = text.length;

    const words = text.trim() === ""
        ? 0
        : text.trim().split(/\s+/).length;

    wordCount.textContent = words;

    const percent = Math.min(

        (text.length / MAX_CHAR) * 100,

        100

    );

    progressBar.style.width = percent + "%";

}



// ------------------------------
// Preview
// ------------------------------

function updatePreview() {

    preview.textContent = editor.value;

}



// ------------------------------
// Render
// ------------------------------

function render() {

    updatePreview();

    updateStats();

}



// ------------------------------
// Editor Input
// ------------------------------

editor.addEventListener("input", () => {

    render();

    saveHistory();

});



// ------------------------------
// Selection
// ------------------------------

function getSelection() {

    return {

        start: editor.selectionStart,

        end: editor.selectionEnd

    };

}



function selectedText() {

    const s = getSelection();

    return editor.value.substring(

        s.start,

        s.end

    );

}



// ------------------------------
// Replace Selection
// ------------------------------

function replaceSelection(newText) {
    const s = getSelection();
    const scrollTop = editor.scrollTop;
    editor.value =
        editor.value.substring(0, s.start)
        +
        newText
        +
        editor.value.substring(s.end);
    editor.focus();
    editor.selectionStart = s.start;
    editor.selectionEnd =
        s.start + newText.length;
    editor.scrollTop = scrollTop;
    render();
    saveHistory();
}



// ------------------------------
// Live Selection Info
// ------------------------------

editor.addEventListener("select", () => {

    const txt = selectedText();

    if (txt.length === 0)

        selectionInfo.textContent =
            "Select text to format";

    else

        selectionInfo.textContent =
            txt.length + " characters selected";

});




// ------------------------------
// Keyboard
// ------------------------------

document.addEventListener("keydown", e => {

    if (e.ctrlKey && e.key === "z") {

        e.preventDefault();

        undo();

    }

    if (e.ctrlKey && e.key === "y") {

        e.preventDefault();

        redo();

    }

});



// ------------------------------
// Copy
// ------------------------------

copyBtn.onclick = async () => {

    await navigator.clipboard.writeText(

        editor.value

    );

    copyBtn.textContent = "Copied!";

    setTimeout(() => {

        copyBtn.textContent = "📋 Copy Output";

    }, 1200);

};



// ------------------------------
// Clear
// ------------------------------

clearBtn.onclick = () => {

    editor.value = "";

    render();

    saveHistory();

};



// ------------------------------
// Undo Redo Buttons
// ------------------------------

undoBtn.onclick = undo;

redoBtn.onclick = redo;



// ------------------------------
// Unicode Mapper
// ------------------------------

function unicodeMap(

    text,

    upperStart,

    lowerStart

) {

    let output = "";

    for (let ch of text) {

        let code = ch.charCodeAt(0);

        if (

            code >= 65 &&
            code <= 90

        ) {

            output +=

                String.fromCodePoint(

                    upperStart +

                    code -

                    65

                );

        }

        else if (

            code >= 97 &&
            code <= 122

        ) {

            output +=

                String.fromCodePoint(

                    lowerStart +

                    code -

                    97

                );

        }

        else {

            output += ch;

        }

    }

    return output;

}



// ------------------------------
// Combining Unicode
// ------------------------------

function underline(text) {

    return [...text]

        .map(

            c => c + "\u0332"

        )

        .join("");

}



function strike(text) {

    return [...text]

        .map(

            c => c + "\u0336"

        )

        .join("");

}



// ------------------------------
// Initial
// ------------------------------

saveHistory();

render();




// =====================================================
// Part 2A - Unicode Styles
// =====================================================


// ------------------------------
// Bold
// ------------------------------

function bold(text) {

    return unicodeMap(

        text,

        0x1D5A0,

        0x1D5BA

    );

}



// ------------------------------
// Italic
// ------------------------------

function italic(text) {

    return unicodeMap(

        text,

        0x1D434,

        0x1D44E

    );

}



// ------------------------------
// Bold Italic
// ------------------------------

function boldItalic(text) {

    return unicodeMap(

        text,

        0x1D468,

        0x1D482

    );

}



// ------------------------------
// Monospace
// ------------------------------

function mono(text) {

    return unicodeMap(

        text,

        0x1D670,

        0x1D68A

    );

}




// =====================================================
// Convert Dispatcher
// =====================================================

function convertText(

    text,

    style

) {

    switch (style) {

        case "bold":

            return bold(text);



        case "italic":

            return italic(text);



        case "boldItalic":

            return boldItalic(text);



        case "mono":

            return mono(text);



        case "underline":

            return underline(text);



        case "strike":

            return strike(text);

        
        case "circled":

            return circled(text);
        
        
        case "squared":
        
            return squared(text);
        
        
        case "negativeSquared":
        
            return negativeSquared(text);


        default:

            return text;

    }

}



// =====================================================
// Toolbar Buttons
// =====================================================

document
.querySelectorAll(".tool")
.forEach(button => {
    button.addEventListener(
        "click",
        () => {
            const text =
                selectedText();
            if (
                text.length === 0
            )
                return;

            const normalizedText = normalizeText(text);
            const style =
                button.dataset.style;
            const converted =
                convertText(
                    normalizedText,
                    style
                );
            replaceSelection(
                converted
            );
        }
    );
});


// =====================================================
// Part 2B
// Circled, Squared & Negative Squared
// =====================================================


// ------------------------------
// Circled
// ------------------------------

function circled(text) {
    let output = "";
    for (const ch of text) {
        const code = ch.charCodeAt(0);
        // A-Z
        if (code >= 65 && code <= 90) {
            output += String.fromCodePoint(
                0x24B6 + (code - 65)
            );
        }
        // a-z
        else if (code >= 97 && code <= 122) {
            output += String.fromCodePoint(
                0x24D0 + (code - 97)
            );
        }
        // 1-9
        else if (code >= 49 && code <= 57) {
            output += String.fromCodePoint(
                0x2460 + (code - 49)
            );
        }
        // 0
        else if (ch === "0") {
            output += "⓪";
        }
        else {
            output += ch;
        }
    }
    return output;
}



// ------------------------------
// Squared
// ------------------------------

const squareMap = {
    A:"🄰",
    B:"🄱",
    C:"🄲",
    D:"🄳",
    E:"🄴",
    F:"🄵",
    G:"🄶",
    H:"🄷",
    I:"🄸",
    J:"🄹",
    K:"🄺",
    L:"🄻",
    M:"🄼",
    N:"🄽",
    O:"🄾",
    P:"🄿",
    Q:"🅀",
    R:"🅁",
    S:"🅂",
    T:"🅃",
    U:"🅄",
    V:"🅅",
    W:"🅆",
    X:"🅇",
    Y:"🅈",
    Z:"🅉"
};



function squared(text){
    let output="";
    for(const ch of text.toUpperCase()){
        output += squareMap[ch] || ch;
    }
    return output;
}



// ------------------------------
// Negative Squared
// ------------------------------

const negativeSquareMap={
A:"🅰",
B:"🅱",
C:"🅲",
D:"🅳",
E:"🅴",
F:"🅵",
G:"🅶",
H:"🅷",
I:"🅸",
J:"🅹",
K:"🅺",
L:"🅻",
M:"🅼",
N:"🅽",
O:"🅾",
P:"🅿",
Q:"🆀",
R:"🆁",
S:"🆂",
T:"🆃",
U:"🆄",
V:"🆅",
W:"🆆",
X:"🆇",
Y:"🆈",
Z:"🆉"
};



function negativeSquared(text){
    let output="";
    for(const ch of text.toUpperCase()){
        output += negativeSquareMap[ch] || ch;
    }
    return output;
}

// =====================================================
// Part 3 - Text Normalization
// =====================================================

const DECODE_MAP = {
    // Bold
    '𝗔': 'A', '𝗕': 'B', '𝗖': 'C', '𝗗': 'D', '𝗘': 'E', '𝗙': 'F', '𝗚': 'G', '𝗛': 'H', '𝗜': 'I', '𝗝': 'J', '𝗞': 'K', '𝗟': 'L', '𝗠': 'M', '𝗡': 'N', '𝗢': 'O', '𝗣': 'P', '𝗤': 'Q', '𝗥': 'R', '𝗦': 'S', '𝗧': 'T', '𝗨': 'U', '𝗩': 'V', '𝗪': 'W', '𝗫': 'X', '𝗬': 'Y', '𝗭': 'Z',
    '𝗮': 'a', '𝗯': 'b', '𝗰': 'c', '𝗱': 'd', '𝗲': 'e', '𝗳': 'f', '𝗴': 'g', '𝗵': 'h', '𝗶': 'i', '𝗷': 'j', '𝗸': 'k', '𝗹': 'l', '𝗺': 'm', '𝗻': 'n', '𝗼': 'o', '𝗽': 'p', '𝗾': 'q', '𝗿': 'r', '𝘀': 's', '𝘁': 't', '𝘂': 'u', '𝘃': 'v', '𝘄': 'w', '𝘅': 'x', '𝘆': 'y', '𝘇': 'z',
    // Italic
    '𝐴': 'A', '𝐵': 'B', '𝐶': 'C', '𝐷': 'D', '𝐸': 'E', '𝐹': 'F', '𝐺': 'G', '𝐻': 'H', '𝐼': 'I', '𝐽': 'J', '𝐾': 'K', '𝐿': 'L', '𝑀': 'M', '𝑁': 'N', '𝑂': 'O', '𝑃': 'P', '𝑄': 'Q', '𝑅': 'R', '𝑆': 'S', '𝑇': 'T', '𝑈': 'U', '𝑉': 'V', '𝑊': 'W', '𝑋': 'X', '𝑌': 'Y', '𝑍': 'Z',
    '𝑎': 'a', '𝑏': 'b', '𝑐': 'c', '𝑑': 'd', '𝑒': 'e', '𝑓': 'f', '𝑔': 'g', 'ℎ': 'h', '𝑖': 'i', '𝑗': 'j', '𝑘': 'k', '𝑙': 'l', '𝑚': 'm', '𝑛': 'n', '𝑜': 'o', '𝑝': 'p', '𝑞': 'q', '𝑟': 'r', '𝑠': 's', '𝑡': 't', '𝑢': 'u', '𝑣': 'v', '𝑤': 'w', '𝑥': 'x', '𝑦': 'y', '𝑧': 'z',
    // Bold Italic
    '𝑨': 'A', '𝑩': 'B', '𝑪': 'C', '𝑫': 'D', '𝑬': 'E', '𝑭': 'F', '𝑮': 'G', '𝑯': 'H', '𝑰': 'I', '𝑱': 'J', '𝑲': 'K', '𝑳': 'L', '𝑴': 'M', '𝑵': 'N', '𝑶': 'O', '𝑷': 'P', '𝑸': 'Q', '𝑹': 'R', '𝑺': 'S', '𝑻': 'T', '𝑼': 'U', '𝑽': 'V', '𝑾': 'W', '𝑿': 'X', '𝒀': 'Y', '𝒁': 'Z',
    '𝒂': 'a', '𝒃': 'b', '𝒄': 'c', '𝒅': 'd', '𝒆': 'e', '𝒇': 'f', '𝒈': 'g', '𝒉': 'h', '𝒊': 'i', '𝒋': 'j', '𝒌': 'k', '𝒍': 'l', '𝒎': 'm', '𝒏': 'n', '𝒐': 'o', '𝒑': 'p', '𝒒': 'q', '𝒓': 'r', '𝒔': 's', '𝒕': 't', '𝒖': 'u', '𝒗': 'v', '𝒘': 'w', '𝒙': 'x', '𝒚': 'y', '𝒛': 'z',
    // Monospace
    '𝙰': 'A', '𝙱': 'B', '𝙲': 'C', '𝙳': 'D', '𝙴': 'E', '𝙵': 'F', '𝙶': 'G', '𝙷': 'H', '𝙸': 'I', '𝙹': 'J', '𝙺': 'K', '𝙻': 'L', '𝙼': 'M', '𝙽': 'N', '𝙾': 'O', '𝙿': 'P', '𝚀': 'Q', '𝚁': 'R', '𝚂': 'S', '𝚃': 'T', '𝚄': 'U', '𝚅': 'V', '𝚆': 'W', '𝚇': 'X', '𝚈': 'Y', '𝚉': 'Z',
    '𝚊': 'a', '𝚋': 'b', '𝚌': 'c', '𝚍': 'd', '𝚎': 'e', '𝚏': 'f', '𝚐': 'g', '𝚑': 'h', '𝚒': 'i', '𝚓': 'j', '𝚔': 'k', '𝚕': 'l', '𝚖': 'm', '𝚗': 'n', '𝚘': 'o', '𝚙': 'p', '𝚚': 'q', '𝚛': 'r', '𝚜': 's', '𝚝': 't', '𝚞': 'u', '𝚟': 'v', '𝚠': 'w', '𝚡': 'x', '𝚢': 'y', '𝚣': 'z',
    // Circled
    'Ⓐ': 'A', 'Ⓑ': 'B', 'Ⓒ': 'C', 'Ⓓ': 'D', 'Ⓔ': 'E', 'Ⓕ': 'F', 'Ⓖ': 'G', 'Ⓗ': 'H', 'Ⓘ': 'I', 'Ⓙ': 'J', 'Ⓚ': 'K', 'Ⓛ': 'L', 'Ⓜ': 'M', 'Ⓝ': 'N', 'Ⓞ': 'O', 'Ⓟ': 'P', 'Ⓠ': 'Q', 'Ⓡ': 'R', 'Ⓢ': 'S', 'Ⓣ': 'T', 'Ⓤ': 'U', 'Ⓥ': 'V', 'Ⓦ': 'W', 'Ⓧ': 'X', 'Ⓨ': 'Y', 'Ⓩ': 'Z',
    'ⓐ': 'a', 'ⓑ': 'b', 'ⓒ': 'c', 'ⓓ': 'd', 'ⓔ': 'e', 'ⓕ': 'f', 'ⓖ': 'g', 'ⓗ': 'h', 'ⓘ': 'i', 'ⓙ': 'j', 'ⓚ': 'k', 'ⓛ': 'l', 'ⓜ': 'm', 'ⓝ': 'n', 'ⓞ': 'o', 'ⓟ': 'p', 'ⓠ': 'q', 'ⓡ': 'r', 'ⓢ': 's', 'ⓣ': 't', 'ⓤ': 'u', 'ⓥ': 'v', 'ⓦ': 'w', 'ⓧ': 'x', 'ⓨ': 'y', 'ⓩ': 'z',
    '⓪': '0', '①': '1', '②': '2', '③': '3', '④': '4', '⑤': '5', '⑥': '6', '⑦': '7', '⑧': '8', '⑨': '9',
    // Squared
    '🄰': 'A', '🄱': 'B', '🄲': 'C', '🄳': 'D', '🄴': 'E', '🄵': 'F', '🄶': 'G', '🄷': 'H', '🄸': 'I', '🄹': 'J', '🄺': 'K', '🄻': 'L', '🄼': 'M', '🄽': 'N', '🄾': 'O', '🄿': 'P', '🅀': 'Q', '🅁': 'R', '🅂': 'S', '🅃': 'T', '🅄': 'U', '🅅': 'V', '🅆': 'W', '🅇': 'X', '🅈': 'Y', '🅉': 'Z',
    // Negative Squared
    '🅰': 'A', '🅱': 'B', '🅲': 'C', '🅳': 'D', '🅴': 'E', '🅵': 'F', '🅶': 'G', '🅷': 'H', '🅸': 'I', '🅹': 'J', '🅺': 'K', '🅻': 'L', '🅼': 'M', '🅽': 'N', '🅾': 'O', '🅿': 'P', '🆀': 'Q', '🆁': 'R', '🆂': 'S', '🆃': 'T', '🆄': 'U', '🆅': 'V', '🆆': 'W', '🆇': 'X', '🆈': 'Y', '🆉': 'Z',
};

function buildNormalizeRegex() {
    const styledChars = Object.keys(DECODE_MAP);
    const pattern = styledChars.map(c => c.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|');
    return new RegExp(pattern, 'g');
}

const NORMALIZE_REGEX = buildNormalizeRegex();

function normalizeText(text) {
    // First, handle combining characters
    let normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Then, use the regex to replace all styled chars in one go
    return normalized.replace(NORMALIZE_REGEX, (match) => DECODE_MAP[match]);
}


