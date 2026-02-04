// Example: Add a custom close button handler for Electron
// ========================================
// INPUT MODAL (REPLACES PROMPT)
// ========================================
function showInputModal(label, defaultValue = '', callback) {
    const modal = document.getElementById('inputModal');
    const labelEl = document.getElementById('inputModalLabel');
    const field = document.getElementById('inputModalField');
    const okBtn = document.getElementById('inputModalOk');
    const cancelBtn = document.getElementById('inputModalCancel');
    modal.style.display = 'flex';
    labelEl.textContent = label;
    field.value = defaultValue;
    field.focus();
    function close(result) {
        modal.style.display = 'none';
        okBtn.onclick = null;
        cancelBtn.onclick = null;
        field.onkeydown = null;
        callback(result);
    }
    okBtn.onclick = () => close(field.value.trim());
    cancelBtn.onclick = () => close(null);
    field.onkeydown = (e) => {
        if (e.key === 'Enter') okBtn.click();
        if (e.key === 'Escape') cancelBtn.click();
    };
}
document.addEventListener('DOMContentLoaded', function() {
    const closeBtn = document.getElementById('electronCloseBtn');
    if (closeBtn && window.electronAPI && window.electronAPI.closeWindow) {
        closeBtn.addEventListener('click', () => {
            window.electronAPI.closeWindow();
        });
    }

    // Intercept external links and use Electron API
    document.querySelectorAll('a[target="_blank"], a.external-link').forEach(function(link) {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            if (window.electronAPI && link.href) {
                window.electronAPI.openExternal(link.href);
            }
        });
    });

    // Example: Add Chapters button
    const addChapterBtn = document.getElementById('addChapterBtn');
    if (addChapterBtn) {
        addChapterBtn.addEventListener('click', function(e) {
            e.preventDefault();
            addChapter();
        });
    }

    // Example: View button
    const viewBtn = document.getElementById('viewBtn');
    if (viewBtn) {
        viewBtn.addEventListener('click', function(e) {
            e.preventDefault();
            // Implement your view logic here
        });
    }

    // Example: Info button
    const infoBtn = document.getElementById('infoBtn');
    if (infoBtn) {
        infoBtn.addEventListener('click', function(e) {
            e.preventDefault();
            // Implement your info logic here
        });
    }

    // Example: Add Dictionary button
    const addDictBtn = document.getElementById('addDictBtn');
    if (addDictBtn) {
        addDictBtn.addEventListener('click', function(e) {
            e.preventDefault();
            // Implement your add dictionary logic here
        });
    }
});
// ===============================
// EXPORT TO PDF (html2pdf)
// ===============================
function exportToPdf() {
    const editorContainer = document.getElementById('richEditor');
    if (!editorContainer || !editorContainer.innerHTML.trim()) {
        alert('No content to export. Please write something first.');
        return; 
    }
    // Get book title for filename
    const titleEl = document.getElementById('sidebarBookTitle');
    const bookTitle = titleEl ? titleEl.textContent : 'Untitled_Book';
    const opt = {
        margin:       0.5,
        filename:     `${bookTitle.replace(/[^a-z0-9]/gi, '_')}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().from(editorContainer).set(opt).save();
}
// ===============================
// TABLE OF CONTENTS (TOC)
// ===============================
function generateTOC() {
    const editor = document.getElementById('richEditor');
    const tocList = document.getElementById('tocList');
    if (!editor || !tocList) return;
    tocList.innerHTML = '';
    // Find headings (H1, H2, H3) in the editor
    const headings = editor.querySelectorAll('h1, h2, h3');
    headings.forEach((heading, idx) => {
        // Add id if missing for anchor
        if (!heading.id) heading.id = 'toc-h-' + idx;
        const li = document.createElement('li');
        li.className = 'toc-item toc-' + heading.tagName.toLowerCase();
        const a = document.createElement('a');
        a.href = '#' + heading.id;
        a.textContent = heading.textContent;
        a.onclick = function(e) {
            e.preventDefault();
            document.getElementById(heading.id).scrollIntoView({behavior:'smooth'});
        };
        li.appendChild(a);
        tocList.appendChild(li);
    });
}

// Show/hide TOC sidebar (toggle with a button or always show as needed)
function showTOC() {
    document.getElementById('tocSidebar').style.display = 'block';
    generateTOC();
}
function hideTOC() {
    document.getElementById('tocSidebar').style.display = 'none';
}


// Integrate TOC generation with editor initialization
function initEditor() {
    const editor = document.getElementById('richEditor');
    if (editor) {
        editor.addEventListener('input', generateTOC);
        generateTOC();
    }
}
/**
 * ========================================
 * GIRMIN
 * Professional Book Editing Software
 * ========================================
 * 
 * Version: 1.0.0
 * Features:
 * - Rich text editing with formatting toolbar
 * - Dictionary-based autocomplete
 * - Chapter and paragraph organization
 * - References and footnotes support
 * - @ tag system for inserting setup values
 * - Auto-save functionality
 */

'use strict';

// ========================================
// CONSTANTS & CONFIGURATION
// ========================================

const APP_CONFIG = {
    VERSION: '1.0.0',
    APP_NAME: 'Girmin',
    AUTOSAVE_KEY: 'girmin_book_autosave',
    METADATA_KEY: 'girmin_book_metadata',
    SETUP_KEY: 'girmin_software_setup',
    API_CHECK_INTERVAL: 50,
    API_CHECK_MAX_ATTEMPTS: 200,
    DEBOUNCE_DELAY: 100
};

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Escape HTML characters for safe rendering
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    if (!text) return '';
    const escapeMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    };
    return text.replace(/[&<>"']/g, c => escapeMap[c]);
}

/**
 * Debounce utility for performance optimization
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(fn, delay) {
    let timer = null;
    return function(...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

// ========================================
// DICTIONARY & AUTOCOMPLETE STATE
// ========================================

let dictionary = [];
let currentDialect = '';
let editor, ghostText, dialectSelect, wordCount, suggestionsList;
let selectedSuggestionIndex = -1;
// ...existing code...

// DOM ready fallback
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(initEditor, 500));
}

// ========================================
// EDITOR INITIALIZATION
// ========================================

/**
 * Initialize the main editor and all components
 */
function initEditor() {

    // Get DOM elements
    editor = document.getElementById('richEditor') || document.getElementById('editor');
    ghostText = document.getElementById('ghostText');
    dialectSelect = document.getElementById('dialectSelect');
    // Setup toolbar events
    setupRichTextToolbar();
    // Dynamically populate language/dictionary options using fetch
    if (dialectSelect) {
        // Clear previous options except the first (placeholder)
        while (dialectSelect.options.length > 1) {
            dialectSelect.remove(1);
        }
        fetch('/api/dictionaries')
            .then(r => r.json())
            .then(dicts => {
                let selectedIdx = 0;
                let browserLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
                let enabledDicts = dicts.filter(d => d.enabled !== false);
                enabledDicts.forEach((d, idx) => {
                    let label = d.language;
                    if (d.script) label += ' [' + d.script + ']';
                    if (d.region) label += ' (' + d.region + ')';
                    else if (d.code) label += ' (' + d.code + ')';
                    const opt = document.createElement('option');
                    opt.value = d.filename.replace('.json','');
                    opt.textContent = label;
                    // Auto-select if only one dictionary or language matches browser
                    if (enabledDicts.length === 1 || (d.language && d.language.toLowerCase() === browserLang)) {
                        selectedIdx = idx + 1; // +1 for placeholder
                    }
                    dialectSelect.appendChild(opt);
                });
                if (selectedIdx > 0) {
                    dialectSelect.selectedIndex = selectedIdx;
                    dialectSelect.dispatchEvent(new Event('change'));
                }
            });
    }
    wordCount = document.getElementById('wordCount');
    suggestionsList = document.getElementById('suggestionsList');

    // ...existing code...

    if (!editor || !ghostText || !suggestionsList) {
        console.error('Missing required DOM elements');
        return;
    }

    // Set up event listeners for rich text autocomplete
    setupRichTextDictionaryIntegration();

    // Clean pasted content, preserving only allowed formatting
    editor.addEventListener('paste', function(e) {
        if (!e.clipboardData) return;
        e.preventDefault();
        let html = e.clipboardData.getData('text/html');
        let text = e.clipboardData.getData('text/plain');
        let cleaned = '';
        if (html) {
            // Create a temp div to parse HTML
            let div = document.createElement('div');
            div.innerHTML = html;
            // Only allow: ul, ol, li, h1-h6, p, blockquote
            function clean(node) {
                const allowedTags = ['UL','OL','LI','H1','H2','H3','H4','H5','H6','P','BLOCKQUOTE'];
                if (node.nodeType === Node.ELEMENT_NODE) {
                    if (!allowedTags.includes(node.tagName)) {
                        // Replace disallowed element with its children
                        let frag = document.createDocumentFragment();
                        let children = Array.from(node.childNodes);
                        for (let child of children) frag.appendChild(clean(child));
                        return frag;
                    }
                    // Remove all attributes
                    while (node.attributes.length > 0) {
                        node.removeAttribute(node.attributes[0].name);
                    }
                    // Recursively clean children (use static array to avoid infinite loop)
                    let children = Array.from(node.childNodes);
                    for (let child of children) {
                        node.replaceChild(clean(child), child);
                    }
                    return node;
                } else if (node.nodeType === Node.TEXT_NODE) {
                    // Preserve text nodes
                    return node.cloneNode();
                }
                // Remove comments and other node types
                return document.createTextNode('');
            }
            // Clean all children of the div and append to a new fragment
            let frag = document.createDocumentFragment();
            let children = Array.from(div.childNodes);
            for (let child of children) {
                let cleanedChild = clean(child);
                frag.appendChild(cleanedChild);
            }
            // Convert fragment to HTML string
            let tempDiv = document.createElement('div');
            tempDiv.appendChild(frag);
            cleaned = tempDiv.innerHTML;
        } else if (text) {
            // Convert plain text to paragraphs
            cleaned = text.split(/\r?\n/).map(line => line ? `<p>${line}</p>` : '').join('');
        }
        // Insert cleaned HTML at cursor
        document.execCommand('insertHTML', false, cleaned);
    });

    if (dialectSelect) {
        dialectSelect.addEventListener('change', loadDictionary);
        loadDictionary();
    }
}

// ========================================
// DICTIONARY MANAGEMENT
// ========================================

/**
 * Load dictionary for the selected dialect
 */
function loadDictionary() {
    const dialect = dialectSelect ? dialectSelect.value : 'yasin';
    
    if (!dialect) {
        dictionary = [];
        if (wordCount) wordCount.textContent = '';
        return;
    }
    
    currentDialect = dialect;
    if (wordCount) wordCount.textContent = 'Loading...';
    fetch(`/dictionaries/${dialect}.json`)
        .then(r => r.json())
        .then(handleDictionaryLoaded)
        .catch(err => {
            if (wordCount) wordCount.textContent = 'Load failed';
        });
}

/**
 * Handle dictionary data after loading
 * @param {Array} words - Array of dictionary words
 */
function handleDictionaryLoaded(words) {
    if (words && Array.isArray(words.words)) {
        dictionary = words.words;
        if (wordCount) wordCount.textContent = '';
    } else if (Array.isArray(words)) {
        dictionary = words;
        if (wordCount) wordCount.textContent = '';
    } else {
        dictionary = [];
        if (wordCount) wordCount.textContent = 'Error';
    }
    // Trigger autocomplete update after dictionary loads
    if (typeof updateGhostText === 'function') updateGhostText();
    if (typeof showSuggestions === 'function') {
        const prefix = getCurrentWord();
        showSuggestions(prefix);
    }
}

// ========================================
// WORD & CURSOR UTILITIES
// ========================================

/**
 * Get the current word at cursor position (for textarea)
 * @returns {string} Current word at cursor
 */
function getCurrentWord() {
    const textarea = editor || document.getElementById('richEditor');
    if (!textarea || typeof textarea.value !== 'string' || typeof textarea.selectionStart !== 'number') return '';
    const text = textarea.value.substring(0, textarea.selectionStart);
    const lines = text.split('\n');
    const currentLine = lines[lines.length - 1];
    const words = currentLine.split(/[\s\-\.\,\!\?\;]+/);
    return words[words.length - 1] ? words[words.length - 1].toLowerCase() : '';
}

/**
 * Get cursor coordinates for positioning suggestions
 * @returns {Object} Coordinates with top and left positions
 */
function getCursorCoordinates() {
    const textarea = editor;
    const text = textarea.value.substring(0, textarea.selectionStart);
    
    const clone = textarea.cloneNode(true);
    clone.style.visibility = 'hidden';
    clone.style.position = 'absolute';
    clone.style.height = 'auto';
    clone.style.width = textarea.offsetWidth + 'px';
    clone.style.whiteSpace = 'pre-wrap';
    clone.style.wordWrap = 'break-word';
    
    clone.textContent = text;
    document.body.appendChild(clone);
    
    const height = clone.scrollHeight;
    document.body.removeChild(clone);
    
    return {
        top: textarea.offsetTop + height - textarea.scrollTop,
        left: textarea.offsetLeft
    };
}

// ========================================
// SUGGESTIONS & AUTOCOMPLETE
// ========================================

/**
 * Show matching dictionary suggestions
 * @param {string} prefix - Current word prefix to match
 */
function showSuggestions(prefix) {
    if (!prefix || prefix.length === 0 || !dictionary.length) {
        suggestionsList.style.display = 'none';
        return;
    }
    
    // Find matches (case-insensitive, starts with prefix)
    const matches = dictionary.filter(word => 
        word.toLowerCase().startsWith(prefix.toLowerCase())
    ).slice(0, 8); // Show max 8 suggestions
    
    if (matches.length === 0) {
        suggestionsList.style.display = 'none';
        return;
    }
    
    // Clear previous suggestions
    suggestionsList.innerHTML = '';
    selectedSuggestionIndex = -1;
    
    // Add suggestion items
    matches.forEach((word, index) => {
        const li = document.createElement('li');
        li.className = 'suggestion-item';
        li.textContent = word;
        li.onclick = () => insertSuggestion(word);
        li.onmouseover = () => {
            // Remove previous selection
            document.querySelectorAll('.suggestion-item').forEach(item => {
                item.classList.remove('selected');
            });
            li.classList.add('selected');
            selectedSuggestionIndex = index;
        };
        
        suggestionsList.appendChild(li);
    });
    
    // Show suggestions box
    const coords = getCursorCoordinates();
    suggestionsList.style.display = 'block';
    suggestionsList.style.top = coords.top + 'px';
    suggestionsList.style.left = coords.left + 'px';
}

// ========================================
// KEYBOARD HANDLING
// ========================================

/**
 * Handle suggestion insertion
 */
    // Dropdown suggestion insertion is disabled

/**
 * Handle keyboard navigation in editor
 * @param {KeyboardEvent} e - Keyboard event
 */
function handleEditorKeydown(e) {
    // Accept inline suggestion on Enter
    if (e.key === 'Enter') {
        const word = getCurrentWord();
        const suggestion = getSuggestion(word);
        if (suggestion && word && suggestion.toLowerCase() !== word.toLowerCase()) {
            e.preventDefault();
            const textarea = editor;
            const cursorPos = textarea.selectionStart;
            const before = textarea.value.substring(0, cursorPos);
            const after = textarea.value.substring(cursorPos);
            let remaining = suggestion.substring(word.length);
            const match = remaining.match(/^[^\s\-\.,!?;]+/);
            if (match) {
                remaining = match[0];
            }
            textarea.value = before + remaining + after;
            textarea.selectionStart = textarea.selectionEnd = cursorPos + remaining.length;
            updateGhostText();
            return;
        }
    }
}

// Hide suggestions when clicking outside
document.addEventListener('click', (e) => {
    if (e.target !== editor && e.target !== suggestionsList) {
        suggestionsList.style.display = 'none';
    }
});

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEditor);
} else {
    initEditor();
}

// ========================================
// EDITOR INPUT HANDLING
// ========================================

/**
 * Handle editor input events
 */
function onEditorInput() {
    updateGhostText();
}

/**
 * Get dictionary suggestion for a prefix
 * @param {string} prefix - Word prefix to search
 * @returns {string|null} Matching word or null
 */
function getSuggestion(prefix) {
    if (!prefix || !dictionary.length) return null;
    const match = dictionary.find(word => word.toLowerCase().startsWith(prefix.toLowerCase()));
    return match || null;
}

// ========================================
// RICH TEXT DICTIONARY INTEGRATION
// ========================================

/**
 * Set up rich text editor with dictionary integration
 */
function setupRichTextDictionaryIntegration() {
    const richEditor = document.getElementById('richEditor');
    if (!richEditor) return;
    
    const debouncedUpdateGhost = debounce(updateGhostTextRich, APP_CONFIG.DEBOUNCE_DELAY);
    
    richEditor.addEventListener('input', debouncedUpdateGhost);
    richEditor.addEventListener('keydown', function(e) {
        // Accept suggestion on Enter
        if (e.key === 'Enter') {
            const word = getCurrentWordRich();
            const suggestion = getSuggestion(word);
            if (suggestion && word && suggestion.toLowerCase() !== word.toLowerCase()) {
                let remaining = suggestion.substring(word.length);
                const match = remaining.match(/^[^\s\-\.,!?;]+/);
                if (match) {
                    remaining = match[0];
                }
                if (remaining) {
                    clearGhostTextRich();
                    document.execCommand('insertText', false, remaining);
                    setTimeout(updateGhostTextRich, 0);
                    e.preventDefault();
                    return;
                }
            }
        }
        setTimeout(debouncedUpdateGhost, 0);
    });
    richEditor.addEventListener('click', debouncedUpdateGhost);
    richEditor.addEventListener('focus', debouncedUpdateGhost);
    richEditor.addEventListener('blur', clearGhostTextRich);
    document.addEventListener('selectionchange', function() {
        if (document.activeElement === richEditor) {
            debouncedUpdateGhost();
            updateFocusParagraph();
            updateToolbarVisibility();
        }
    });
    
    // Focus mode: track active paragraph
    richEditor.addEventListener('click', updateFocusParagraph);
    richEditor.addEventListener('keyup', updateFocusParagraph);
    richEditor.addEventListener('focus', updateFocusParagraph);
    richEditor.addEventListener('blur', clearFocusParagraph);
    
    // Toolbar: show when text is selected
    document.addEventListener('selectionchange', updateToolbarVisibility);
}

// ========================================
// FOCUS MODE - Highlight current paragraph
// ========================================

function updateFocusParagraph() {
    const richEditor = document.getElementById('richEditor');
    if (!richEditor) return;
    
    // Remove previous focus-active class
    const prevActive = richEditor.querySelectorAll('.focus-active');
    prevActive.forEach(el => el.classList.remove('focus-active'));
    
    // Find current paragraph
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    let node = selection.anchorNode;
    if (!node) return;
    
    // Walk up to find the direct child of richEditor
    while (node && node.parentNode !== richEditor) {
        node = node.parentNode;
    }
    
    if (node && node.nodeType === Node.ELEMENT_NODE) {
        node.classList.add('focus-active');
    }
}

function clearFocusParagraph() {
    const richEditor = document.getElementById('richEditor');
    if (!richEditor) return;
    
    // Small delay to allow clicking toolbar without clearing
    setTimeout(() => {
        if (document.activeElement !== richEditor) {
            const prevActive = richEditor.querySelectorAll('.focus-active');
            prevActive.forEach(el => el.classList.remove('focus-active'));
        }
    }, 150);
}

function updateToolbarVisibility() {
    const toolbar = document.querySelector('.toolbar-autohide');
    if (!toolbar) return;
    
    const selection = window.getSelection();
    const hasSelection = selection && selection.toString().length > 0;
    
    if (hasSelection) {
        toolbar.classList.add('toolbar-active');
    } else {
        toolbar.classList.remove('toolbar-active');
    }
}

// ========================================
// TEXT DIRECTION (RTL/LTR) WITH AUTO-FONT
// ========================================

// Default fonts for each direction (can be customized in Settings)
const DEFAULT_RTL_FONT = 'Noto Nastaliq Urdu';
const DEFAULT_LTR_FONT = 'Georgia';

/**
 * Get the configured font for a direction
 */
function getDirectionFont(dir) {
    if (dir === 'rtl') {
        return localStorage.getItem('burushaski_rtl_font') || DEFAULT_RTL_FONT;
    } else {
        return localStorage.getItem('burushaski_ltr_font') || DEFAULT_LTR_FONT;
    }
}

/**
 * Set the default font for a direction
 */
function setDirectionFont(dir, fontName) {
    if (dir === 'rtl') {
        localStorage.setItem('burushaski_rtl_font', fontName);
    } else {
        localStorage.setItem('burushaski_ltr_font', fontName);
    }
}

/**
 * Set text direction for the editor or selected paragraph
 * @param {string} dir - 'ltr' or 'rtl'
 */
function setTextDirection(dir) {
    const richEditor = document.getElementById('richEditor');
    if (!richEditor) return;
    
    const font = getDirectionFont(dir);
    const selection = window.getSelection();
    
    // If there's a selection, apply to the paragraph containing the selection
    if (selection.rangeCount > 0 && selection.anchorNode) {
        let node = selection.anchorNode;
        
        // Walk up to find block-level element
        while (node && node !== richEditor) {
            if (node.nodeType === Node.ELEMENT_NODE) {
                const tagName = node.tagName.toLowerCase();
                if (['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote'].includes(tagName)) {
                    node.setAttribute('dir', dir);
                    node.style.textAlign = dir === 'rtl' ? 'right' : 'left';
                    node.style.fontFamily = font;
                    updateDirectionButtons(dir);
                    return;
                }
            }
            node = node.parentNode;
        }
    }
    
    // If no block element found, apply to entire editor
    richEditor.setAttribute('dir', dir);
    richEditor.style.textAlign = dir === 'rtl' ? 'right' : 'left';
    richEditor.style.fontFamily = font;
    updateDirectionButtons(dir);
    
    // Save preference
    localStorage.setItem('burushaski_editor_direction', dir);
}

/**
 * Toggle entire document direction
 */
function toggleDocumentDirection() {
    const richEditor = document.getElementById('richEditor');
    if (!richEditor) return;
    
    const currentDir = richEditor.getAttribute('dir') || 'ltr';
    const newDir = currentDir === 'rtl' ? 'ltr' : 'rtl';
    
    setTextDirection(newDir);
}

/**
 * Update direction button active states
 */
function updateDirectionButtons(dir) {
    const ltrBtn = document.getElementById('dirLtrBtn');
    const rtlBtn = document.getElementById('dirRtlBtn');
    
    if (ltrBtn) {
        ltrBtn.classList.toggle('active', dir === 'ltr');
    }
    if (rtlBtn) {
        rtlBtn.classList.toggle('active', dir === 'rtl');
    }
}

/**
 * Initialize text direction from saved preference
 */
function initTextDirection() {
    const savedDir = localStorage.getItem('burushaski_editor_direction');
    if (savedDir) {
        const richEditor = document.getElementById('richEditor');
        if (richEditor) {
            const font = getDirectionFont(savedDir);
            richEditor.setAttribute('dir', savedDir);
            richEditor.style.textAlign = savedDir === 'rtl' ? 'right' : 'left';
            richEditor.style.fontFamily = font;
            updateDirectionButtons(savedDir);
        }
    }
}

// Export functions globally
window.setTextDirection = setTextDirection;
window.toggleDocumentDirection = toggleDocumentDirection;
window.setDirectionFont = setDirectionFont;
window.getDirectionFont = getDirectionFont;

// ========================================
// PREVIEW / READ MODE
// ========================================

let isPreviewMode = false;
let exitPreviewBtn = null;

/**
 * Toggle preview/read mode
 */
function togglePreviewMode() {
    isPreviewMode = !isPreviewMode;
    const body = document.body;
    const previewBtn = document.getElementById('previewBtn');
    const richEditor = document.getElementById('richEditor');
    
    if (isPreviewMode) {
        // Enter preview mode
        body.classList.add('preview-mode');
        if (previewBtn) previewBtn.classList.add('active');
        if (richEditor) richEditor.setAttribute('contenteditable', 'false');
        
        // Create exit button
        if (!exitPreviewBtn) {
            exitPreviewBtn = document.createElement('button');
            exitPreviewBtn.className = 'exit-preview-btn';
            exitPreviewBtn.textContent = '✕ Exit Read Mode';
            exitPreviewBtn.onclick = togglePreviewMode;
            document.body.appendChild(exitPreviewBtn);
        }
        exitPreviewBtn.style.display = 'block';
    } else {
        // Exit preview mode
        body.classList.remove('preview-mode');
        if (previewBtn) previewBtn.classList.remove('active');
        if (richEditor) richEditor.setAttribute('contenteditable', 'true');
        
        // Hide exit button
        if (exitPreviewBtn) {
            exitPreviewBtn.style.display = 'none';
        }
    }
}

// Keyboard shortcut: Escape to exit preview mode
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && isPreviewMode) {
        togglePreviewMode();
    }
});

// Export globally
window.togglePreviewMode = togglePreviewMode;

// ========================================
// GHOST TEXT OVERLAY
// ========================================

/**
 * Dummy updateGhostPosition for scroll event
 */
function updateGhostPosition() {
    // Optional: reposition ghostText on scroll
}

/**
 * Update ghost text display for autocomplete preview
 */
function updateGhostText() {
    const text = editor.value;
    const cursorPos = editor.selectionStart;
    const word = getCurrentWord();
    const suggestion = getSuggestion(word);
    
    if (!suggestion || !word) {
        ghostText.innerHTML = '';
        return;
    }
    
    let remaining = suggestion.substring(word.length);
    const match = remaining.match(/^[^\s\-\.,!?;]+/);
    if (match) {
        remaining = match[0];
    }
    const before = text.substring(0, cursorPos);
    ghostText.innerHTML =
        `<span class="ghost-text-main">${escapeHtml(before)}</span><span class="ghost-text-suggestion">${escapeHtml(remaining)}</span>`;
    ghostText.style.display = 'block';
}

// ========================================
// RICH TEXT TOOLBAR
// ========================================

/**
 * Set up rich text formatting toolbar
 */
function setupRichTextToolbar() {
    const toolbar = document.querySelector('.editor-toolbar');
    const richEditor = document.getElementById('richEditor');
    const colorInput = document.getElementById('toolbarColor');
    const highlightInput = document.getElementById('toolbarHighlight');
    const headingSelect = document.getElementById('headingSelect');

    if (!toolbar || !richEditor) return;

    toolbar.addEventListener('click', function(e) {
        const btn = e.target.closest('.toolbar-btn');
        if (!btn) return;
        const cmd = btn.dataset.cmd;
        if (cmd) {
            richEditor.focus();
            applyRichTextCommand(cmd);
        }
        // Handle footnote button
        if (btn.id === 'insertFootnoteBtn') {
            insertFootnote();
        }
        // Handle citation button
        if (btn.id === 'insertCitationBtn') {
            if (!book.references || book.references.length === 0) {
                alert('No references added yet. Add a reference first using the References panel in the sidebar.');
                return;
            }
            const refNum = prompt(`Enter reference number (1-${book.references.length}):`);
            const idx = parseInt(refNum, 10) - 1;
            if (isNaN(idx) || idx < 0 || idx >= book.references.length) {
                alert('Invalid reference number.');
                return;
            }
            insertCitationAtCursor(idx);
        }
        // Handle IPA conversion button
        if (btn.id === 'ipaConvertToolbarBtn') {
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const selectedText = selection.toString();
                if (selectedText.length > 0) {
                    const ipa = convertToIPA(selectedText);
                    // Replace selected text with IPA
                    document.execCommand('insertText', false, ipa);
                }
            }
            richEditor.focus();
        }
    });

    // Cross-browser rich text formatting handler
    function applyRichTextCommand(cmd) {
        const sel = window.getSelection();
        if (!sel.rangeCount) {
            console.log('No selection range');
            return;
        }
        const range = sel.getRangeAt(0);
        if (!richEditor.contains(range.commonAncestorContainer)) {
            console.log('Selection not in editor');
            return;
        }
        let tag;
        switch (cmd) {
            case 'bold': tag = 'b'; break;
            case 'italic': tag = 'i'; break;
            case 'underline': tag = 'u'; break;
            case 'strikeThrough': tag = 's'; break;
            case 'insertUnorderedList': tag = 'ul'; break;
            case 'insertOrderedList': tag = 'ol'; break;
            case 'justifyLeft': tag = 'left'; break;
            case 'justifyCenter': tag = 'center'; break;
            case 'justifyRight': tag = 'right'; break;
            default: tag = null;
        }
        if (tag === 'left' || tag === 'center' || tag === 'right') {
            let block = range.startContainer;
            console.log('Alignment command:', cmd, 'block:', block);
            // Traverse up to find a block element
            while (block && block !== richEditor && block.nodeType !== 1) {
                block = block.parentNode;
            }
            while (block && block !== richEditor && block.nodeType === 1 && !/^(P|DIV|LI|H1|H2|H3|H4|H5|H6)$/i.test(block.nodeName)) {
                block = block.parentNode;
            }
            console.log('Resolved block for alignment:', block);
            if (block && block !== richEditor && block.nodeType === 1) {
                block.style.textAlign = tag;
                console.log('Set textAlign', tag, 'on', block);
            } else if (range && !range.collapsed) {
                // Wrap selection in a <p> and set alignment
                const p = document.createElement('p');
                p.style.textAlign = tag;
                p.appendChild(range.extractContents());
                range.insertNode(p);
                // Move caret after
                range.setStartAfter(p);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
                console.log('Wrapped selection in <p> and set textAlign', tag);
            } else {
                // If no block found, set on editor
                richEditor.style.textAlign = tag;
                console.log('Set textAlign', tag, 'on editor');
            }
            return;
        }
        if (tag === 'ul' || tag === 'ol') {
            // List: wrap block in <ul> or <ol> and <li>
            let block = range.startContainer;
            while (block && block !== richEditor && block.nodeType === 1 && !/^(P|DIV|LI)$/i.test(block.nodeName)) {
                block = block.parentNode;
            }
            if (block && block !== richEditor) {
                const list = document.createElement(tag);
                const li = document.createElement('li');
                li.innerHTML = block.innerHTML;
                list.appendChild(li);
                block.parentNode.replaceChild(list, block);
            }
        } else if (tag === 'left' || tag === 'center' || tag === 'right') {
            // Alignment: set text-align on block
            let block = range.startContainer;
            while (block && block !== richEditor && block.nodeType === 1 && !/^(P|DIV|LI|H1|H2|H3|H4|H5|H6)$/i.test(block.nodeName)) {
                block = block.parentNode;
            }
            if (block && block !== richEditor) {
                block.style.textAlign = tag;
            } else {
                // If no block found, set on editor
                richEditor.style.textAlign = tag;
            }
        } else if (tag) {
            // Inline: wrap selection in tag
            if (range.collapsed) return;
            const el = document.createElement(tag);
            el.appendChild(range.extractContents());
            range.insertNode(el);
            // Move caret after
            range.setStartAfter(el);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
        }
    }

    // Text color
    colorInput.addEventListener('input', function() {
        document.execCommand('foreColor', false, colorInput.value);
        richEditor.focus();
    });

    // Highlight color
    highlightInput.addEventListener('input', function() {
        document.execCommand('hiliteColor', false, highlightInput.value);
        richEditor.focus();
    });

    // Heading select
    headingSelect.addEventListener('change', function() {
        let value = headingSelect.value;
        // Only allow H1, H2, H3 (or extend as needed)
        if (!/^H[1-6]$/i.test(value)) {
            headingSelect.value = '';
            return;
        }
        richEditor.focus();
        const sel = window.getSelection();
        if (!sel.rangeCount) {
            headingSelect.value = '';
            return;
        }
        const range = sel.getRangeAt(0);
        if (!richEditor.contains(range.commonAncestorContainer)) {
            headingSelect.value = '';
            return;
        }
        // Only convert selected text to heading, not the whole block
        if (!range.collapsed) {
            // Wrap selected text in heading
            const heading = document.createElement(value);
            heading.appendChild(range.extractContents());
            range.insertNode(heading);
            // Move caret after the heading for normal text
            range.setStartAfter(heading);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
        }
        // Always reset to paragraph after applying
        setTimeout(() => { headingSelect.value = ''; }, 0);
    });

    // Intercept Enter in heading: insert normal paragraph after heading
    richEditor.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            const sel = window.getSelection();
            if (!sel.rangeCount) return;
            const range = sel.getRangeAt(0);
            let node = range.startContainer;
            // Find if inside a heading
            while (node && node !== richEditor && node.nodeType !== 1) node = node.parentNode;
            while (node && node !== richEditor && node.nodeType === 1 && !/^(H1|H2|H3|H4|H5|H6)$/i.test(node.nodeName)) {
                node = node.parentNode;
            }
            if (node && /^(H1|H2|H3|H4|H5|H6)$/i.test(node.nodeName)) {
                // Only split if at end of heading
                const tempRange = range.cloneRange();
                tempRange.selectNodeContents(node);
                tempRange.collapse(false);
                if (range.compareBoundaryPoints(Range.END_TO_END, tempRange) === 0) {
                    e.preventDefault();
                    // Insert a new <p> after heading
                    const p = document.createElement('p');
                    p.appendChild(document.createElement('br'));
                    if (node.nextSibling) {
                        node.parentNode.insertBefore(p, node.nextSibling);
                    } else {
                        node.parentNode.appendChild(p);
                    }
                    // Place caret in new paragraph
                    const newRange = document.createRange();
                    newRange.setStart(p, 0);
                    newRange.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(newRange);
                }
            }
        }
    });

    // Font select
    const fontSelect = document.getElementById('fontSelect');
    if (fontSelect) {
        fontSelect.addEventListener('change', function() {
            const value = fontSelect.value;
            if (value) {
                document.execCommand('fontName', false, value);
            }
            richEditor.focus();
            fontSelect.value = '';
        });
    }

    // Font size select
    const fontSizeSelect = document.getElementById('fontSizeSelect');
    if (fontSizeSelect) {
        fontSizeSelect.addEventListener('change', function() {
            const value = fontSizeSelect.value;
            if (value) {
                document.execCommand('fontSize', false, value);
            }
            richEditor.focus();
            fontSizeSelect.value = '';
        });
    }

    // Keyboard shortcuts
    richEditor.addEventListener('keydown', function(e) {
        if (e.ctrlKey) {
            if (e.key === 'b' || e.key === 'B') {
                e.preventDefault();
                document.execCommand('bold');
            } else if (e.key === 'i' || e.key === 'I') {
                e.preventDefault();
                document.execCommand('italic');
            } else if (e.key === 'u' || e.key === 'U') {
                e.preventDefault();
                document.execCommand('underline');
            } else if (e.key === 's' || e.key === 'S') {
                e.preventDefault();
                saveBookToFile();
            }
        }
    });
}

// ========================================
// CARET POSITION UTILITIES
// ========================================

/**
 * Get caret character offset within a contenteditable element
 * @param {HTMLElement} element - The contenteditable element
 * @returns {number} Character offset
 */
function getCaretCharacterOffsetWithin(element) {
    let caretOffset = 0;
    const sel = window.getSelection();
    if (sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        const preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(element);
        preCaretRange.setEnd(range.endContainer, range.endOffset);
        caretOffset = preCaretRange.toString().length;
    }
    return caretOffset;
}

/**
 * Set caret position within a contenteditable element
 * @param {HTMLElement} element - The contenteditable element
 * @param {number} chars - Character position to set
 */
function setCaretPosition(element, chars) {
    if (chars >= 0) {
        const selection = window.getSelection();
        let node = element;
        let stack = [];
        let found = false;
        let charCount = 0;
        // Depth-first search for text node
        stack.push(element);
        while (stack.length > 0 && !found) {
            node = stack.pop();
            if (node.nodeType === 3) { // text node
                if (charCount + node.length >= chars) {
                    const range = document.createRange();
                    range.setStart(node, chars - charCount);
                    range.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(range);
                    found = true;
                } else {
                    charCount += node.length;
                }
            } else if (node.childNodes) {
                for (let i = node.childNodes.length - 1; i >= 0; i--) {
                    stack.push(node.childNodes[i]);
                }
            }
        }
    }
}

/**
 * Get current word at cursor in rich text editor
 * @returns {string} Current word at cursor
 */
function getCurrentWordRich() {
    const richEditor = document.getElementById('richEditor');
    const caretPos = getCaretCharacterOffsetWithin(richEditor);
    const text = richEditor.innerText.substring(0, caretPos);
    const lines = text.split('\n');
    const currentLine = lines[lines.length - 1];
    const words = currentLine.split(/[\s\-\.,!?;]+/);
    return words[words.length - 1].toLowerCase();
}

/**
 * Get caret coordinates in contenteditable for positioning dropdowns
 * @param {HTMLElement} element - The contenteditable element
 * @returns {Object} Coordinates with left, top, and height
 */
function getCaretCoordinates(element) {
    const sel = window.getSelection();
    if (sel.rangeCount === 0) return { left: 0, top: 0 };
    const range = sel.getRangeAt(0).cloneRange();
    // Insert a temporary span at caret
    const tempSpan = document.createElement('span');
    tempSpan.textContent = '\u200b'; // zero-width space
    range.insertNode(tempSpan);
    const rect = tempSpan.getBoundingClientRect();
    const editorRect = element.getBoundingClientRect();
    const coords = {
        left: rect.left - editorRect.left + element.scrollLeft,
        top: rect.top - editorRect.top + element.scrollTop,
        height: rect.height
    };
    tempSpan.parentNode.removeChild(tempSpan);
    return coords;
}

/**
 * Get caret client rect for positioning
 * @returns {DOMRect|null} Client rect or null
 */
function getCaretClientRect() {
    const sel = window.getSelection();
    if (!sel.rangeCount) return null;
    const range = sel.getRangeAt(0).cloneRange();
    // Insert a temporary span at caret
    const temp = document.createElement('span');
    temp.appendChild(document.createTextNode('\u200b'));
    range.insertNode(temp);
    const rect = temp.getBoundingClientRect();
    temp.parentNode.removeChild(temp);
    return rect;
}

// ========================================
// RICH TEXT GHOST SUGGESTIONS
// ========================================

/**
 * Update inline ghost suggestion in rich text editor
 */
function updateGhostTextRich() {
    const richEditor = document.getElementById('richEditor');
    // Remove any previous ghost span
    const oldGhost = richEditor.querySelector('.ghost-inline-suggestion');
    if (oldGhost) oldGhost.remove();

    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    if (!range.collapsed) return; // Only show ghost when caret is not selecting

    const caretPos = getCaretCharacterOffsetWithin(richEditor);
    const text = richEditor.innerText;
    const word = getCurrentWordRich();
    const suggestion = getSuggestion(word);
    if (!suggestion || !word) {
        return;
    }
    let remaining = suggestion.substring(word.length);
    const match = remaining.match(/^[^\s\-\.,!?;]+/);
    if (match) {
        remaining = match[0];
    }
    if (!remaining) return;

    // Insert ghost span at caret
    const ghostSpan = document.createElement('span');
    ghostSpan.className = 'ghost-inline-suggestion';
    ghostSpan.textContent = remaining;
    ghostSpan.setAttribute('contenteditable', 'false');
    ghostSpan.style.opacity = '0.7';
    ghostSpan.style.color = '#b0b0b0';
    ghostSpan.style.fontStyle = 'italic';
    ghostSpan.style.pointerEvents = 'none';

    // Insert the ghost span at the caret
    const ghostRange = range.cloneRange();
    ghostRange.collapse(true);
    ghostRange.insertNode(ghostSpan);

    // Move caret back to original position (before ghost span)
    sel.removeAllRanges();
    sel.addRange(range);
}

function clearGhostTextRich() {
    const richEditor = document.getElementById('richEditor');
    const oldGhost = richEditor.querySelector('.ghost-inline-suggestion');
    if (oldGhost) oldGhost.remove();
}

// ========================================
// BOOK DATA MODEL
// ========================================

/**
 * Book data structure
 */
let book = {
    title: '',
    author: '',
    summary: '',
    frontMatter: [],  // Foreword, Preface, Acknowledgements, Dedication, etc.
    chapters: [], // No default chapter or paragraph
    backMatter: [],   // Glossary, Appendix, Bibliography, Index, About the Author, etc.
    references: [],
    currentChapter: 0,
    currentParagraph: 0,
    currentSection: 'chapters',  // 'front', 'chapters', or 'back'
    currentSectionIndex: 0
};

// Common book section types
const FRONT_MATTER_TYPES = [
    'Foreword',
    'Preface', 
    'Acknowledgements',
    'Dedication',
    'Introduction',
    'Prologue',
    'Table of Contents',
    'List of Figures',
    'List of Tables',
    'Custom...'
];

const BACK_MATTER_TYPES = [
    'Epilogue',
    'Afterword',
    'Glossary',
    'Appendix',
    'Bibliography',
    'Index',
    'About the Author',
    'Colophon',
    'Custom...'
];

// Track which chapters are expanded in the tree
let expandedChapters = {};
let expandedFrontMatter = {};
let expandedBackMatter = {};

// Track unsaved changes
let hasUnsavedChanges = false;

// ========================================
// AUTOSAVE FUNCTIONALITY
// ========================================

/**
 * Save book to localStorage
 */
function autosaveBook() {
    const richEditor = document.getElementById('richEditor');
    if (richEditor && book.currentChapter != null && book.chapters[book.currentChapter]) {
        const chapter = book.chapters[book.currentChapter];
        if (chapter.paragraphs && chapter.paragraphs[book.currentParagraph]) {
            chapter.paragraphs[book.currentParagraph].content = richEditor.innerHTML;
        }
    }
    localStorage.setItem(APP_CONFIG.AUTOSAVE_KEY, JSON.stringify(book));
    hasUnsavedChanges = true;
    updateUnsavedIndicator();
}

/**
 * Update visual indicator for unsaved changes
 */
function updateUnsavedIndicator() {
    const titleEl = document.getElementById('sidebarBookTitle');
    if (titleEl) {
        const currentTitle = book.title || 'Untitled Book';
        titleEl.textContent = hasUnsavedChanges ? `${currentTitle} •` : currentTitle;
    }
}

/**
 * Try to restore autosaved book data
 */
function tryRestoreAutosave() {
    const data = localStorage.getItem(APP_CONFIG.AUTOSAVE_KEY);
    if (data) {
        try {
            const parsed = JSON.parse(data);
            if (parsed.chapters && Array.isArray(parsed.chapters)) {
                // Auto-restore without prompting (book already saved in storage)
                book.title = parsed.title || '';
                book.author = parsed.author || '';
                book.summary = parsed.summary || '';
                book.references = parsed.references || [];
                book.frontMatter = (parsed.frontMatter || []).map(s => ({
                    title: s.title || '',
                    content: s.content || ''
                }));
                book.backMatter = (parsed.backMatter || []).map(s => ({
                    title: s.title || '',
                    content: s.content || ''
                }));
                book.chapters = parsed.chapters.map(ch => ({ 
                    title: ch.title || '', 
                    content: ch.content || '',
                    paragraphs: Array.isArray(ch.paragraphs) ? ch.paragraphs : [],
                    footnotes: ch.footnotes || []
                }));
                book.currentChapter = parsed.currentChapter || 0;
                book.currentParagraph = parsed.currentParagraph || 0;
                book.currentSection = parsed.currentSection || 'chapters';
                book.currentSectionIndex = parsed.currentSectionIndex || 0;
                
                // Update UI
                updateSidebarBookTitle();
                renderChapters();
                renderParagraphs();
                renderReferences();
                renderFootnotes();
                renderFrontMatter();
                renderBackMatter();
                
                // Load content into editor based on current section
                if (book.currentSection === 'front' && book.frontMatter.length > 0) {
                    selectFrontMatterSection(book.currentSectionIndex);
                } else if (book.currentSection === 'back' && book.backMatter.length > 0) {
                    selectBackMatterSection(book.currentSectionIndex);
                } else {
                    selectChapter(book.currentChapter, book.currentParagraph);
                }
                
                // Mark as no unsaved changes since we just loaded
                hasUnsavedChanges = false;
                updateUnsavedIndicator();
                
                console.log('[Editor] Restored book:', book.title, 'with', book.chapters.length, 'chapters,', 
                    book.frontMatter.length, 'front matter,', book.backMatter.length, 'back matter');
                return true;
            }
        } catch (e) {
            console.error('[Editor] Error restoring autosave:', e);
        }
    }
    loadBookMetadata();
    return false;
}

// ========================================
// METADATA & BRANDING
// ========================================

/**
 * Load book metadata from localStorage
 */
function loadBookMetadata() {
    const metadata = JSON.parse(localStorage.getItem(APP_CONFIG.METADATA_KEY) || '{}');
    if (metadata.title) book.title = metadata.title;
    if (metadata.author) book.author = metadata.author;
    updateSidebarBookTitle();
    loadSidebarBranding();
}

/**
 * Load and display company branding in sidebar
 */
function loadSidebarBranding() {
    const setup = JSON.parse(localStorage.getItem(APP_CONFIG.SETUP_KEY) || '{}');
    const logoContainer = document.getElementById('brandingLogo');
    const nameContainer = document.getElementById('brandingName');
    const brandingDiv = document.getElementById('sidebarBranding');
    
    if (!brandingDiv) return;
    
    const hasLogo = setup.logo;
    const hasName = setup.companyName;
    
    if (!hasLogo && !hasName) {
        brandingDiv.style.display = 'none';
        return;
    }
    
    brandingDiv.style.display = 'flex';
    
    if (logoContainer) {
        logoContainer.innerHTML = hasLogo ? `<img src="${setup.logo}" alt="Logo">` : '';
    }
    
    if (nameContainer) {
        nameContainer.textContent = setup.companyName || '';
    }
}

/**
 * Update sidebar book title display
 */
function updateSidebarBookTitle() {
    const sidebarTitle = document.getElementById('sidebarBookTitle');
    if (sidebarTitle) {
        sidebarTitle.textContent = book.title || 'Untitled Book';
    }
    hasUnsavedChanges = false;
    updateUnsavedIndicator();
}

// ========================================
// CHAPTER TREE RENDERING
// ========================================

/**
 * Render the chapter tree in the sidebar
 */
function renderChapters() {
    const chapterList = document.getElementById('chapterList');
    const noChaptersMsg = document.getElementById('noChaptersMsg');
    if (!chapterList) return;
    chapterList.innerHTML = '';
    if (book.chapters.length === 0) {
        noChaptersMsg.style.display = 'block';
        return;
    } else {
        noChaptersMsg.style.display = 'none';
    }
    
    book.chapters.forEach((ch, chIdx) => {
        // Initialize expanded state if not set
        if (expandedChapters[chIdx] === undefined) expandedChapters[chIdx] = true;
        const isExpanded = expandedChapters[chIdx];
        const hasParagraphs = ch.paragraphs && ch.paragraphs.length > 0;
        
        // Chapter row
        const chapterRow = document.createElement('div');
        chapterRow.className = 'tree-item tree-chapter' + (chIdx === book.currentChapter ? ' selected' : '');
        
        // Make the entire row clickable
        chapterRow.onclick = (e) => {
            // Don't trigger if clicking on the arrow
            if (e.target.classList.contains('tree-arrow')) return;
            selectChapter(chIdx, 0);
        };
        
        // Expand/collapse arrow
        const arrow = document.createElement('span');
        arrow.className = 'tree-arrow';
        if (hasParagraphs) {
            arrow.textContent = isExpanded ? '▼' : '▶';
            arrow.onclick = (e) => {
                e.stopPropagation();
                expandedChapters[chIdx] = !expandedChapters[chIdx];
                renderChapters();
            };
        } else {
            arrow.textContent = '  ';
        }
        
        // Chapter title
        const title = document.createElement('span');
        title.className = 'tree-label';
        title.textContent = ch.title || 'Untitled Chapter';
        
        // Context menu on right-click
        chapterRow.oncontextmenu = (e) => {
            e.preventDefault();
            showChapterContextMenu(e, chIdx);
        };
        
        chapterRow.append(arrow, title);
        chapterList.appendChild(chapterRow);
        
        // Paragraphs (if expanded)
        if (isExpanded && hasParagraphs) {
            ch.paragraphs.forEach((para, pIdx) => {
                const paraRow = document.createElement('div');
                paraRow.className = 'tree-item tree-paragraph' + 
                    (chIdx === book.currentChapter && pIdx === book.currentParagraph ? ' selected' : '');
                
                // Make the entire row clickable
                paraRow.onclick = () => selectChapter(chIdx, pIdx);
                
                const indent = document.createElement('span');
                indent.className = 'tree-indent';
                indent.textContent = '    ';
                
                const paraTitle = document.createElement('span');
                paraTitle.className = 'tree-label';
                paraTitle.textContent = para.title || 'Untitled Paragraph';
                
                // Context menu on right-click
                paraRow.oncontextmenu = (e) => {
                    e.preventDefault();
                    showParagraphContextMenu(e, chIdx, pIdx);
                };
                
                paraRow.append(indent, paraTitle);
                chapterList.appendChild(paraRow);
            });
        }
    });
}

// ========================================
// CONTEXT MENUS
// ========================================

/**
 * Show context menu for a chapter
 * @param {MouseEvent} e - Right-click event
 * @param {number} chIdx - Chapter index
 */
function showChapterContextMenu(e, chIdx) {
    removeContextMenu();
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.left = e.pageX + 'px';
    menu.style.top = e.pageY + 'px';
    
    const items = [
        { label: 'Add Paragraph', action: () => addParagraphToChapter(chIdx) },
        { label: 'Rename', action: () => renameChapter(chIdx) },
        { label: 'Delete', action: () => deleteChapter(chIdx) },
        { label: 'Move Up', action: () => moveChapter(chIdx, -1) },
        { label: 'Move Down', action: () => moveChapter(chIdx, 1) }
    ];
    
    items.forEach(item => {
        const menuItem = document.createElement('div');
        menuItem.className = 'context-menu-item';
        menuItem.textContent = item.label;
        menuItem.onclick = () => { removeContextMenu(); item.action(); };
        menu.appendChild(menuItem);
    });
    
    document.body.appendChild(menu);
    setTimeout(() => document.addEventListener('click', removeContextMenu, { once: true }), 10);
}

/**
 * Show context menu for a paragraph
 * @param {MouseEvent} e - Right-click event
 * @param {number} chIdx - Chapter index
 * @param {number} pIdx - Paragraph index
 */
function showParagraphContextMenu(e, chIdx, pIdx) {
    removeContextMenu();
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.left = e.pageX + 'px';
    menu.style.top = e.pageY + 'px';
    
    const items = [
        { label: 'Rename', action: () => renameParagraphInChapter(chIdx, pIdx) },
        { label: 'Delete', action: () => deleteParagraphInChapter(chIdx, pIdx) },
        { label: 'Move Up', action: () => moveParagraphInChapter(chIdx, pIdx, -1) },
        { label: 'Move Down', action: () => moveParagraphInChapter(chIdx, pIdx, 1) }
    ];
    
    items.forEach(item => {
        const menuItem = document.createElement('div');
        menuItem.className = 'context-menu-item';
        menuItem.textContent = item.label;
        menuItem.onclick = () => { removeContextMenu(); item.action(); };
        menu.appendChild(menuItem);
    });
    
    document.body.appendChild(menu);
    setTimeout(() => document.addEventListener('click', removeContextMenu, { once: true }), 10);
}

/**
 * Remove any existing context menu
 */
function removeContextMenu() {
    const existing = document.querySelector('.context-menu');
    if (existing) existing.remove();
}

// ========================================
// PARAGRAPH MANAGEMENT
// ========================================

/**
 * Add a paragraph to a specific chapter
 * @param {number} chIdx - Chapter index
 */
function addParagraphToChapter(chIdx) {
    const chapter = book.chapters[chIdx];
    if (!chapter) return;
    if (!chapter.paragraphs) chapter.paragraphs = [];
    const newTitle = prompt('Enter paragraph title:', `Paragraph ${chapter.paragraphs.length + 1}`);
    if (!newTitle || !newTitle.trim()) return;
    chapter.paragraphs.push({ title: newTitle.trim(), content: '' });
    book.currentChapter = chIdx;
    book.currentParagraph = chapter.paragraphs.length - 1;
    expandedChapters[chIdx] = true;
    renderChapters();
    selectChapter(chIdx, book.currentParagraph);
    autosaveBook();
}

function addParagraphToCurrent() {
    if (book.chapters.length === 0) {
        alert('Add a chapter first.');
        return;
    }
    addParagraphToChapter(book.currentChapter);
}

function renameParagraphInChapter(chIdx, pIdx) {
    const chapter = book.chapters[chIdx];
    if (!chapter || !chapter.paragraphs) return;
    const newTitle = prompt('Rename paragraph:', chapter.paragraphs[pIdx].title);
    if (newTitle && newTitle.trim()) {
        chapter.paragraphs[pIdx].title = newTitle.trim();
        renderChapters();
        autosaveBook();
    }
}

function deleteParagraphInChapter(chIdx, pIdx) {
    const chapter = book.chapters[chIdx];
    if (!chapter || !chapter.paragraphs || chapter.paragraphs.length <= 1) return;
    if (!confirm('Delete this paragraph?')) return;
    chapter.paragraphs.splice(pIdx, 1);
    if (book.currentChapter === chIdx && book.currentParagraph >= chapter.paragraphs.length) {
        book.currentParagraph = chapter.paragraphs.length - 1;
    }
    renderChapters();
    selectChapter(chIdx, book.currentParagraph);
    autosaveBook();
}

function moveParagraphInChapter(chIdx, pIdx, dir) {
    const chapter = book.chapters[chIdx];
    if (!chapter || !chapter.paragraphs) return;
    const newIdx = pIdx + dir;
    if (newIdx < 0 || newIdx >= chapter.paragraphs.length) return;
    const temp = chapter.paragraphs[pIdx];
    chapter.paragraphs[pIdx] = chapter.paragraphs[newIdx];
    chapter.paragraphs[newIdx] = temp;
    if (book.currentChapter === chIdx) {
        if (book.currentParagraph === pIdx) book.currentParagraph = newIdx;
        else if (book.currentParagraph === newIdx) book.currentParagraph = pIdx;
    }
    renderChapters();
    selectChapter(chIdx, book.currentParagraph);
    autosaveBook();
}

function renderParagraphs() {
    const paragraphList = document.getElementById('paragraphList');
    if (!paragraphList) return;
    paragraphList.innerHTML = '';
    const chapter = book.chapters[book.currentChapter];
    if (!chapter || !chapter.paragraphs) return;
    chapter.paragraphs.forEach((para, idx) => {
        const li = document.createElement('li');
        li.textContent = para.title;
        if (idx === book.currentParagraph) li.classList.add('selected');
        li.onclick = () => selectParagraph(idx);
        const actions = document.createElement('span');
        actions.className = 'chapter-actions';
        // Rename
        const renameBtn = document.createElement('button');
        renameBtn.className = 'chapter-action-btn';
        renameBtn.title = 'Rename';
        renameBtn.innerHTML = '&#9998;';
        renameBtn.onclick = (e) => { e.stopPropagation(); renameParagraph(idx); };
        // Delete
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'chapter-action-btn';
        deleteBtn.title = 'Delete';
        deleteBtn.innerHTML = '&#128465;';
        deleteBtn.onclick = (e) => { e.stopPropagation(); deleteParagraph(idx); };
        // Move up
        const upBtn = document.createElement('button');
        upBtn.className = 'chapter-action-btn';
        upBtn.title = 'Move Up';
        upBtn.innerHTML = '&#8593;';
        upBtn.onclick = (e) => { e.stopPropagation(); moveParagraph(idx, -1); };
        // Move down
        const downBtn = document.createElement('button');
        downBtn.className = 'chapter-action-btn';
        downBtn.title = 'Move Down';
        downBtn.innerHTML = '&#8595;';
        downBtn.onclick = (e) => { e.stopPropagation(); moveParagraph(idx, 1); };
        actions.append(renameBtn, deleteBtn, upBtn, downBtn);
        li.appendChild(actions);
        paragraphList.appendChild(li);
    });
}

function selectParagraph(idx) {
    const richEditor = document.getElementById('richEditor');
    if (!richEditor) {
        console.warn('selectParagraph: richEditor not found in DOM');
        return;
    }
    
    // Save current paragraph content
    const chapter = book.chapters[book.currentChapter];
    if (chapter && chapter.paragraphs && chapter.paragraphs[book.currentParagraph] && richEditor.innerHTML) {
        chapter.paragraphs[book.currentParagraph].content = richEditor.innerHTML;
    }
    
    // Switch to the new paragraph
    book.currentParagraph = idx;
    
    // Load the new paragraph's content
    if (chapter && chapter.paragraphs && chapter.paragraphs[idx]) {
        richEditor.innerHTML = chapter.paragraphs[idx].content || '';
    } else {
        richEditor.innerHTML = '';
    }
    
    // Update UI
    renderChapters();
    renderParagraphs();
    
    // Autosave
    autosaveBook();
    
    // Focus the editor
    richEditor.focus();
}

function addParagraph() {
    const chapter = book.chapters[book.currentChapter];
    if (!chapter) return;
    const newTitle = prompt('Enter paragraph title:', `Paragraph ${chapter.paragraphs.length + 1}`);
    if (!newTitle || !newTitle.trim()) return;
    // Add empty paragraph
    chapter.paragraphs.push({ title: newTitle.trim(), content: '' });
    book.currentParagraph = chapter.paragraphs.length - 1;
    renderParagraphs();
    // Clear the editor for new paragraph
    const richEditor = document.getElementById('richEditor');
    if (richEditor) richEditor.innerHTML = '';
    selectParagraph(book.currentParagraph);
    autosaveBook();
}

function renameParagraph(idx) {
    const chapter = book.chapters[book.currentChapter];
    if (!chapter) return;
    const newTitle = prompt('Rename paragraph:', chapter.paragraphs[idx].title);
    if (newTitle && newTitle.trim()) {
        chapter.paragraphs[idx].title = newTitle.trim();
        renderParagraphs();
        autosaveBook();
    }
}

function deleteParagraph(idx) {
    const chapter = book.chapters[book.currentChapter];
    if (!chapter || chapter.paragraphs.length <= 1) return;
    if (!confirm('Delete this paragraph?')) return;
    chapter.paragraphs.splice(idx, 1);
    if (book.currentParagraph >= chapter.paragraphs.length) {
        book.currentParagraph = chapter.paragraphs.length - 1;
    }
    renderParagraphs();
    selectParagraph(book.currentParagraph);
    autosaveBook();
}

function moveParagraph(idx, dir) {
    const chapter = book.chapters[book.currentChapter];
    if (!chapter) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= chapter.paragraphs.length) return;
    const temp = chapter.paragraphs[idx];
    chapter.paragraphs[idx] = chapter.paragraphs[newIdx];
    chapter.paragraphs[newIdx] = temp;
    if (book.currentParagraph === idx) book.currentParagraph = newIdx;
    else if (book.currentParagraph === newIdx) book.currentParagraph = idx;
    renderParagraphs();
    selectParagraph(book.currentParagraph);
    autosaveBook();
}

function renameChapter(idx) {
    const newTitle = prompt('Rename chapter:', book.chapters[idx].title);
    if (newTitle && newTitle.trim()) {
        book.chapters[idx].title = newTitle.trim();
        renderChapters();
        autosaveBook();
    }
}

function deleteChapter(idx) {
    if (book.chapters.length <= 1) return;
    if (!confirm('Delete this chapter?')) return;
    book.chapters.splice(idx, 1);
    if (book.currentChapter >= book.chapters.length) {
        book.currentChapter = book.chapters.length - 1;
    }
    renderChapters();
    selectChapter(book.currentChapter);
    autosaveBook();
}

function moveChapter(idx, dir) {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= book.chapters.length) return;
    const temp = book.chapters[idx];
    book.chapters[idx] = book.chapters[newIdx];
    book.chapters[newIdx] = temp;
    if (book.currentChapter === idx) book.currentChapter = newIdx;
    else if (book.currentChapter === newIdx) book.currentChapter = idx;
    renderChapters();
    selectChapter(book.currentChapter);
    autosaveBook();
}


// Select a chapter and update the editor
function selectChapter(idx, paraIdx) {
    // Save current content before switching
    const richEditor = document.getElementById('richEditor');
    if (!richEditor) {
        console.warn('selectChapter: richEditor not found in DOM');
        return;
    }
    // Save current content first
    saveCurrentContent();
    // Switch to chapters section
    book.currentSection = 'chapters';
    book.currentChapter = idx;
    // If paraIdx is null or chapter has no paragraphs, clear editor and do not select a paragraph
    const chapter = book.chapters[idx];
    if (paraIdx == null || !chapter || !chapter.paragraphs || chapter.paragraphs.length === 0) {
        book.currentParagraph = 0;
        richEditor.innerHTML = '';
    } else {
        book.currentParagraph = paraIdx;
        // Load the new paragraph's content into the editor
        if (chapter.paragraphs[book.currentParagraph]) {
            richEditor.innerHTML = chapter.paragraphs[book.currentParagraph].content || '';
        } else {
            richEditor.innerHTML = '';
        }
    }
    // Update the sidebar UI to show selection
    renderChapters();
    renderParagraphs();
    renderFootnotes();
    renderFrontMatter();
    renderBackMatter();
    // Autosave state
    autosaveBook();
    // Focus the editor
    richEditor.focus();
}

// Initialize book editor UI
function setupBookEditorUI() {
    const addChapterBtn = document.getElementById('addChapterBtn');
    const addParagraphBtn = document.getElementById('addParagraphBtn');
    const richEditor = document.getElementById('richEditor');
    
    if (addChapterBtn) addChapterBtn.onclick = addChapter;
    if (addParagraphBtn) addParagraphBtn.onclick = addParagraph;
    if (richEditor) richEditor.addEventListener('input', autosaveBook);
    
    // Load metadata and update sidebar title
    loadBookMetadata();
    
    // IMPORTANT: Try to restore saved book FIRST, before rendering
    tryRestoreAutosave();
    
    // If no saved data was restored, render default state
    if (book.chapters.length === 0 || (book.chapters.length === 1 && !book.chapters[0].title)) {
        renderChapters();
        renderParagraphs();
        selectChapter(0, 0);
    }
}


function addChapter() {
    showInputModal('Enter chapter title:', `Chapter ${book.chapters.length + 1}`, function(newTitle) {
        if (!newTitle) return;
        // Add chapter with NO paragraphs by default
        book.chapters.push({ title: newTitle.trim(), paragraphs: [] });
        book.currentChapter = book.chapters.length - 1;
        book.currentParagraph = 0;
        book.currentSection = 'chapters';
        renderChapters();
        renderParagraphs();
        renderFrontMatter();
        renderBackMatter();
        // Do not select a paragraph since none exist yet
        selectChapter(book.currentChapter, null);
        autosaveBook();
    });
}

// ========================================
// FRONT & BACK MATTER SECTIONS
// ========================================

/**
 * Directly add a book section with a specific title (called from mega menu)
 */
function addBookSectionDirect(type, title) {
    const targetArray = type === 'front' ? book.frontMatter : book.backMatter;
    
    if (!targetArray) {
        if (type === 'front') book.frontMatter = [];
        else book.backMatter = [];
    }
    
    const arr = type === 'front' ? book.frontMatter : book.backMatter;
    
    arr.push({
        title: title,
        content: ''
    });
    // Switch to the new section
    book.currentSection = type;
    book.currentSectionIndex = arr.length - 1;
    // Clear the editor for new section
    const richEditor = document.getElementById('richEditor');
    if (richEditor) richEditor.innerHTML = '';
    if (type === 'front') {
        renderFrontMatter();
        selectFrontMatterSection(book.currentSectionIndex);
    } else {
        renderBackMatter();
        selectBackMatterSection(book.currentSectionIndex);
    }
    // Close the mega menu
    closeSectionMegaMenus();
    autosaveBook();
}

/**
 * Add a custom section with user-provided title
 */
function addBookSectionCustom(type) {
    const title = prompt('Enter custom section name:');
    if (!title || !title.trim()) return;
    
    addBookSectionDirect(type, title.trim());
}

/**
 * Close all section mega menus
 */
function closeSectionMegaMenus() {
    document.querySelectorAll('.section-mega-menu').forEach(menu => {
        menu.style.display = 'none';
        setTimeout(() => menu.style.display = '', 100);
    });
}

/**
 * Show a dialog to add a book section (front or back matter) - legacy function
 */
function addBookSection(type) {
    const sectionTypes = type === 'front' ? FRONT_MATTER_TYPES : BACK_MATTER_TYPES;
    const targetArray = type === 'front' ? book.frontMatter : book.backMatter;
    
    // Create a simple selection dialog
    const sectionType = prompt(
        `Select a ${type} matter section type:\n\n` +
        sectionTypes.map((s, i) => `${i + 1}. ${s}`).join('\n') +
        '\n\nEnter the number or type a custom name:'
    );
    
    if (!sectionType || !sectionType.trim()) return;
    
    let title;
    const num = parseInt(sectionType);
    if (!isNaN(num) && num >= 1 && num <= sectionTypes.length) {
        title = sectionTypes[num - 1];
        if (title === 'Custom...') {
            title = prompt('Enter custom section name:');
            if (!title || !title.trim()) return;
        }
    } else {
        title = sectionType.trim();
    }
    
    targetArray.push({
        title: title,
        content: ''
    });
    
    // Switch to the new section
    book.currentSection = type;
    book.currentSectionIndex = targetArray.length - 1;
    
    if (type === 'front') {
        renderFrontMatter();
        selectFrontMatterSection(book.currentSectionIndex);
    } else {
        renderBackMatter();
        selectBackMatterSection(book.currentSectionIndex);
    }
    
    autosaveBook();
}

/**
 * Render front matter sections in the sidebar
 */
function renderFrontMatter() {
    const listEl = document.getElementById('frontMatterList');
    if (!listEl) return;
    listEl.innerHTML = '';
    
    if (!book.frontMatter) book.frontMatter = [];
    
    book.frontMatter.forEach((section, idx) => {
        const row = document.createElement('div');
        row.className = 'tree-item tree-section' + 
            (book.currentSection === 'front' && book.currentSectionIndex === idx ? ' selected' : '');
        row.onclick = () => selectFrontMatterSection(idx);
        
        const icon = document.createElement('span');
        icon.className = 'tree-icon';
        icon.textContent = '📄';
        
        const title = document.createElement('span');
        title.className = 'tree-label';
        title.textContent = section.title || 'Untitled';
        
        row.oncontextmenu = (e) => {
            e.preventDefault();
            showSectionContextMenu(e, 'front', idx);
        };
        
        row.append(icon, title);
        listEl.appendChild(row);
    });
}

/**
 * Render back matter sections in the sidebar
 */
function renderBackMatter() {
    const listEl = document.getElementById('backMatterList');
    if (!listEl) return;
    listEl.innerHTML = '';
    
    if (!book.backMatter) book.backMatter = [];
    
    book.backMatter.forEach((section, idx) => {
        const row = document.createElement('div');
        row.className = 'tree-item tree-section' + 
            (book.currentSection === 'back' && book.currentSectionIndex === idx ? ' selected' : '');
        row.onclick = () => selectBackMatterSection(idx);
        
        const icon = document.createElement('span');
        icon.className = 'tree-icon';
        icon.textContent = '📄';
        
        const title = document.createElement('span');
        title.className = 'tree-label';
        title.textContent = section.title || 'Untitled';
        
        row.oncontextmenu = (e) => {
            e.preventDefault();
            showSectionContextMenu(e, 'back', idx);
        };
        
        row.append(icon, title);
        listEl.appendChild(row);
    });
}

/**
 * Select a front matter section to edit
 */
function selectFrontMatterSection(idx) {
    const richEditor = document.getElementById('richEditor');
    if (!richEditor) return;
    
    // Save current content
    saveCurrentContent();
    
    // Switch to front matter
    book.currentSection = 'front';
    book.currentSectionIndex = idx;
    
    // Load content
    if (book.frontMatter[idx]) {
        richEditor.innerHTML = book.frontMatter[idx].content || '';
    } else {
        richEditor.innerHTML = '';
    }
    
    // Update UI
    renderFrontMatter();
    renderBackMatter();
    renderChapters();
    autosaveBook();
    richEditor.focus();
}

/**
 * Select a back matter section to edit
 */
function selectBackMatterSection(idx) {
    const richEditor = document.getElementById('richEditor');
    if (!richEditor) return;
    
    // Save current content
    saveCurrentContent();
    
    // Switch to back matter
    book.currentSection = 'back';
    book.currentSectionIndex = idx;
    
    // Load content
    if (book.backMatter[idx]) {
        richEditor.innerHTML = book.backMatter[idx].content || '';
    } else {
        richEditor.innerHTML = '';
    }
    
    // Update UI
    renderFrontMatter();
    renderBackMatter();
    renderChapters();
    autosaveBook();
    richEditor.focus();
}

/**
 * Save current editor content to the appropriate section
 */
function saveCurrentContent() {
    const richEditor = document.getElementById('richEditor');
    if (!richEditor) return;
    
    const content = richEditor.innerHTML;
    
    if (book.currentSection === 'front') {
        if (book.frontMatter[book.currentSectionIndex]) {
            book.frontMatter[book.currentSectionIndex].content = content;
        }
    } else if (book.currentSection === 'back') {
        if (book.backMatter[book.currentSectionIndex]) {
            book.backMatter[book.currentSectionIndex].content = content;
        }
    } else {
        // chapters
        const chapter = book.chapters[book.currentChapter];
        if (chapter && chapter.paragraphs && chapter.paragraphs[book.currentParagraph]) {
            chapter.paragraphs[book.currentParagraph].content = content;
        }
    }
}

/**
 * Show context menu for book sections (front/back matter)
 */
function showSectionContextMenu(event, type, idx) {
    // Remove any existing context menu
    const existing = document.querySelector('.context-menu');
    if (existing) existing.remove();
    
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.cssText = `
        position: fixed;
        left: ${event.clientX}px;
        top: ${event.clientY}px;
        background: #2a2a2c;
        border: 1px solid #404040;
        border-radius: 6px;
        padding: 4px 0;
        z-index: 10000;
        min-width: 150px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    
    const targetArray = type === 'front' ? book.frontMatter : book.backMatter;
    
    const items = [
        { label: '✏️ Rename', action: () => renameSection(type, idx) },
        { label: '🗑️ Delete', action: () => deleteSection(type, idx) },
        { label: '⬆️ Move Up', action: () => moveSection(type, idx, -1) },
        { label: '⬇️ Move Down', action: () => moveSection(type, idx, 1) }
    ];
    
    items.forEach(item => {
        const menuItem = document.createElement('div');
        menuItem.textContent = item.label;
        menuItem.style.cssText = `
            padding: 6px 12px;
            cursor: pointer;
            font-size: 13px;
            color: #e0e0e0;
        `;
        menuItem.onmouseenter = () => menuItem.style.background = '#3a3a3c';
        menuItem.onmouseleave = () => menuItem.style.background = 'transparent';
        menuItem.onclick = () => {
            menu.remove();
            item.action();
        };
        menu.appendChild(menuItem);
    });
    
    document.body.appendChild(menu);
    
    // Close on click outside
    setTimeout(() => {
        document.addEventListener('click', function closeMenu() {
            menu.remove();
            document.removeEventListener('click', closeMenu);
        }, { once: true });
    }, 0);
}

function renameSection(type, idx) {
    const targetArray = type === 'front' ? book.frontMatter : book.backMatter;
    const newTitle = prompt('Rename section:', targetArray[idx].title);
    if (newTitle && newTitle.trim()) {
        targetArray[idx].title = newTitle.trim();
        type === 'front' ? renderFrontMatter() : renderBackMatter();
        autosaveBook();
    }
}

function deleteSection(type, idx) {
    const targetArray = type === 'front' ? book.frontMatter : book.backMatter;
    if (!confirm(`Delete "${targetArray[idx].title}"?`)) return;
    
    targetArray.splice(idx, 1);
    
    // Adjust current section if needed
    if (book.currentSection === type) {
        if (book.currentSectionIndex >= targetArray.length) {
            book.currentSectionIndex = Math.max(0, targetArray.length - 1);
        }
        if (targetArray.length === 0) {
            // Switch back to chapters
            book.currentSection = 'chapters';
            selectChapter(0, 0);
        } else {
            if (type === 'front') {
                selectFrontMatterSection(book.currentSectionIndex);
            } else {
                selectBackMatterSection(book.currentSectionIndex);
            }
        }
    }
    
    type === 'front' ? renderFrontMatter() : renderBackMatter();
    autosaveBook();
}

function moveSection(type, idx, direction) {
    const targetArray = type === 'front' ? book.frontMatter : book.backMatter;
    const newIdx = idx + direction;
    
    if (newIdx < 0 || newIdx >= targetArray.length) return;
    
    [targetArray[idx], targetArray[newIdx]] = [targetArray[newIdx], targetArray[idx]];
    
    if (book.currentSection === type && book.currentSectionIndex === idx) {
        book.currentSectionIndex = newIdx;
    }
    
    type === 'front' ? renderFrontMatter() : renderBackMatter();
    autosaveBook();
}

// Expose functions to window
window.addBookSection = addBookSection;
window.addBookSectionDirect = addBookSectionDirect;
window.addBookSectionCustom = addBookSectionCustom;
window.selectFrontMatterSection = selectFrontMatterSection;
window.selectBackMatterSection = selectBackMatterSection;


// ========================================
// FILE OPERATIONS
// ========================================

let projectDirectoryHandle = null;
let currentFileHandle = null;
let currentFileName = null;

// Restore file handle and file name from localStorage if available (for seamless save after reload)
if (window.showSaveFilePicker && window.localStorage) {
    // File handles can only be restored if the browser supports the File System Access API
    if ('showOpenFilePicker' in window && 'showSaveFilePicker' in window) {
        // Try to restore file handle from localStorage (if available)
        if (window.localStorage.getItem('girmin_current_file_name')) {
            currentFileName = window.localStorage.getItem('girmin_current_file_name');
        }
        // FileSystemHandle cannot be serialized, but we can use the name to avoid prompting for save location
    }
}

/**
 * Save book to file using File System Access API
 */
async function saveBookToFile() {
    // Save current chapter content before export
    const richEditor = document.getElementById('richEditor');
    if (richEditor && book.currentChapter != null && book.chapters[book.currentChapter]) {
        const chapter = book.chapters[book.currentChapter];
        if (chapter.paragraphs && chapter.paragraphs[book.currentParagraph]) {
            chapter.paragraphs[book.currentParagraph].content = richEditor.innerHTML;
        }
    }
    const bookData = JSON.stringify(book, null, 2);
    let fileName = (book.title ? book.title.replace(/[^a-z0-9]/gi, '_') : 'book') + '.json';
    // Use remembered file name if available
    if (currentFileName) fileName = currentFileName;
    // Persist file name in localStorage for future saves
    if (window.localStorage) {
        window.localStorage.setItem('girmin_current_file_name', fileName);
    }

    if (window.showSaveFilePicker) {
        try {
            // If no file handle, prompt user to pick save location
            if (!currentFileHandle) {
                currentFileHandle = await window.showSaveFilePicker({
                    suggestedName: fileName,
                    types: [{
                        description: 'Book JSON',
                        accept: { 'application/json': ['.json'] }
                    }]
                });
            }
            // Save to the file (silently on subsequent saves)
            const writable = await currentFileHandle.createWritable();
            await writable.write(bookData);
            await writable.close();
            if (window.localStorage) {
                window.localStorage.setItem('girmin_current_file_name', fileName);
            }
            hasUnsavedChanges = false;
            updateUnsavedIndicator();
            alert('Your document is saved.');
        } catch (err) {
            if (err.name !== 'AbortError') {
                alert('Failed to save: ' + err.message);
            }
        }
    } else {
        // Fallback: download as before, but use the same file name if loaded from file input
        const blob = new Blob([bookData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
        if (window.localStorage) {
            window.localStorage.setItem('girmin_current_file_name', fileName);
        }
        hasUnsavedChanges = false;
        updateUnsavedIndicator();
        alert('Your document is saved.');
    }
}



async function loadBookFromFile(file) {
        // Debug: Log file object and currentFileName before and after assignment
        console.log('[DEBUG] loadBookFromFile called with file:', file);
    // If File System Access API and no file provided, let user pick a file
    if (window.showOpenFilePicker && !file) {
        try {
            const [fileHandle] = await window.showOpenFilePicker({
                types: [{
                    description: 'Book JSON',
                    accept: { 'application/json': ['.json'] }
                }]
            });
            currentFileHandle = fileHandle;
            file = await fileHandle.getFile();
            currentFileName = file.name;
            // Persist file name in localStorage
            if (window.localStorage) {
                window.localStorage.setItem('girmin_current_file_name', currentFileName);
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                alert('Failed to load: ' + err.message);
            }
            return;
        }
    }
    if (file) {
        currentFileName = file.name;
        // Persist file name in localStorage
        if (window.localStorage) {
            window.localStorage.setItem('girmin_current_file_name', currentFileName);
        }
    }
    console.log('[DEBUG] After assignment, currentFileName:', currentFileName);
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (!data.chapters || !Array.isArray(data.chapters)) throw new Error('Invalid book file');
            book.title = data.title || '';
            book.author = data.author || '';
            book.summary = data.summary || '';
            book.references = data.references || [];
            // Load front matter
            book.frontMatter = (data.frontMatter || []).map(s => ({
                title: s.title || '',
                content: s.content || '',
                paragraphs: s.paragraphs || [{ title: 'Paragraph 1', content: s.content || '' }],
                footnotes: s.footnotes || []
            }));
            // Load chapters
            book.chapters = (data.chapters || []).map(ch => ({ 
                title: ch.title || '', 
                content: ch.content || '',
                paragraphs: ch.paragraphs || [{ title: 'Paragraph 1', content: ch.content || '' }],
                footnotes: ch.footnotes || []
            }));
            // Load back matter
            book.backMatter = (data.backMatter || []).map(s => ({
                title: s.title || '',
                content: s.content || '',
                paragraphs: s.paragraphs || [{ title: 'Paragraph 1', content: s.content || '' }],
                footnotes: s.footnotes || []
            }));
            book.currentChapter = 0;
            book.currentParagraph = 0;
            // Save to metadata storage
            localStorage.setItem(APP_CONFIG.METADATA_KEY, JSON.stringify({
                title: book.title,
                author: book.author,
                summary: book.summary
            }));
            updateSidebarBookTitle();
            renderFrontMatter();
            renderChapters();
            renderBackMatter();
            renderReferences();
            renderFootnotes();
            // Default to first chapter or section
            if (book.frontMatter.length > 0) {
                selectFrontMatterSection(0);
            } else if (book.chapters.length > 0) {
                selectChapter(0, 0);
            } else if (book.backMatter.length > 0) {
                selectBackMatterSection(0);
            }
            autosaveBook();
        } catch (err) {
            alert('Failed to load book: ' + err.message);
        }
    };
    reader.readAsText(file);
}

function newBook() {
    if (!confirm('Start a new book? Unsaved changes will be lost.')) return;
    book.title = '';
    book.author = '';
    book.summary = '';
    book.references = [];
    book.chapters = [];
    book.currentChapter = 0;
    book.currentParagraph = 0;
    
    // Clear metadata storage
    localStorage.removeItem(APP_CONFIG.METADATA_KEY);
    
    updateSidebarBookTitle();
    renderChapters();
    renderParagraphs();
    renderReferences();
    selectChapter(0, 0);
    autosaveBook();
}


function setupBookFileButtons() {
    const saveBtn = document.getElementById('saveBookBtn');
    const loadBtn = document.getElementById('loadBookBtn');
    const loadInput = document.getElementById('loadBookInput');
    const newBtn = document.getElementById('newBookBtn');
    
    if (saveBtn) {
        saveBtn.onclick = saveBookToFile;
    }
    
    if (loadBtn) {
        loadBtn.onclick = handleLoadClick;
    }
    
    if (loadInput) {
        loadInput.onchange = function(e) {
            if (e.target.files && e.target.files[0]) {
                loadBookFromFile(e.target.files[0]);
            }
            e.target.value = '';
        };
    }
    
    if (newBtn) {
        newBtn.onclick = handleNewClick;
    }
}

/**
 * Handle load button click
 */
async function handleLoadClick() {
    if (window.showOpenFilePicker) {
        await loadBookFromFile();
    } else {
        const loadInput = document.getElementById('loadBookInput');
        if (loadInput) loadInput.click();
    }
}

/**
 * Handle new book button click
 */
function handleNewClick() {
    if (!confirm('Start a new book? This will clear unsaved changes.')) return;
    
    // Clear current book data
    currentFileHandle = null;
    projectDirectoryHandle = null;
    localStorage.removeItem(APP_CONFIG.AUTOSAVE_KEY);
    localStorage.removeItem(APP_CONFIG.METADATA_KEY);
    
    // Redirect to metadata form for new book setup
    window.location.href = 'book-metadata.html?new=true';
}

// ========================================
// REFERENCES & BIBLIOGRAPHY
// ========================================
function renderReferences() {
    const refsList = document.getElementById('refsList');
    if (!refsList) return;
    refsList.innerHTML = '';
    if (!book.references) book.references = [];
    book.references.forEach((ref, idx) => {
        const li = document.createElement('li');
        const textSpan = document.createElement('span');
        textSpan.className = 'ref-text';
        textSpan.textContent = `[${idx + 1}] ${ref.text}`;
        textSpan.title = ref.text;
        const actions = document.createElement('span');
        actions.className = 'ref-actions';
        // Edit
        const editBtn = document.createElement('button');
        editBtn.className = 'ref-action-btn';
        editBtn.innerHTML = '✎';
        editBtn.title = 'Edit';
        editBtn.onclick = (e) => { e.stopPropagation(); editReference(idx); };
        // Delete
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'ref-action-btn';
        deleteBtn.innerHTML = '✕';
        deleteBtn.title = 'Delete';
        deleteBtn.onclick = (e) => { e.stopPropagation(); deleteReference(idx); };
        actions.append(editBtn, deleteBtn);
        li.append(textSpan, actions);
        li.onclick = () => insertCitationAtCursor(idx);
        refsList.appendChild(li);
    });
}

function addReference() {
    showInputModal('Enter reference (e.g., Author, Title, Year, Publisher):', '', function(text) {
        if (!text || !text.trim()) return;
        if (!book.references) book.references = [];
        book.references.push({ text: text.trim() });
        renderReferences();
        autosaveBook();
    });
}

function insertCitationPrompt() {
    if (!book.references || book.references.length === 0) {
        alert('No references added yet. Add a reference first using the References panel in the sidebar.');
        return;
    }
    const refNum = prompt(`Enter reference number (1-${book.references.length}):`);
    const idx = parseInt(refNum, 10) - 1;
    if (isNaN(idx) || idx < 0 || idx >= book.references.length) {
        alert('Invalid reference number.');
        return;
    }
    insertCitationAtCursor(idx);
}

function editReference(idx) {
    const ref = book.references[idx];
    if (!ref) return;
    const newText = prompt('Edit reference:', ref.text);
    if (newText && newText.trim()) {
        book.references[idx].text = newText.trim();
        renderReferences();
        autosaveBook();
    }
}

function deleteReference(idx) {
    if (!confirm('Delete this reference?')) return;
    book.references.splice(idx, 1);
    renderReferences();
    autosaveBook();
}

function insertCitationAtCursor(refIdx) {
    const richEditor = document.getElementById('richEditor');
    richEditor.focus();
    const citation = document.createElement('span');
    citation.className = 'citation-marker';
    citation.contentEditable = 'false';
    citation.innerHTML = `[${refIdx + 1}]`;
    citation.title = book.references[refIdx]?.text || '';
    citation.dataset.refIdx = refIdx;
    const sel = window.getSelection();
    if (sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(citation);
        range.setStartAfter(citation);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
    }
    autosaveBook();
}

// --- Footnotes ---
function getChapterFootnotes() {
    const chapter = book.chapters[book.currentChapter];
    if (!chapter) return [];
    if (!chapter.footnotes) chapter.footnotes = [];
    return chapter.footnotes;
}

function renderFootnotes() {
    const footnotesList = document.getElementById('footnotesList');
    if (!footnotesList) return;
    footnotesList.innerHTML = '';
    const footnotes = getChapterFootnotes();
    footnotes.forEach((fn, idx) => {
        const li = document.createElement('li');
        const textSpan = document.createElement('span');
        textSpan.className = 'footnote-text';
        textSpan.textContent = `${idx + 1}. ${fn.text}`;
        textSpan.title = fn.text;
        const actions = document.createElement('span');
        actions.className = 'footnote-actions';
        // Edit
        const editBtn = document.createElement('button');
        editBtn.className = 'footnote-action-btn';
        editBtn.innerHTML = '✎';
        editBtn.title = 'Edit';
        editBtn.onclick = (e) => { e.stopPropagation(); editFootnote(idx); };
        // Delete
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'footnote-action-btn';
        deleteBtn.innerHTML = '✕';
        deleteBtn.title = 'Delete';
        deleteBtn.onclick = (e) => { e.stopPropagation(); deleteFootnote(idx); };
        actions.append(editBtn, deleteBtn);
        li.append(textSpan, actions);
        footnotesList.appendChild(li);
    });
}

function insertFootnote() {
    showInputModal('Enter footnote text:', '', function(text) {
        if (!text || !text.trim()) return;
        const chapter = book.chapters[book.currentChapter];
        if (!chapter) {
            alert('No chapter selected. Please select or add a chapter first.');
            return;
        }
        if (!chapter.footnotes) chapter.footnotes = [];
        const fnIdx = chapter.footnotes.length;
        chapter.footnotes.push({ text: text.trim() });
        // Insert footnote marker in editor
        const richEditor = document.getElementById('richEditor');
        richEditor.focus();
        const marker = document.createElement('sup');
        marker.className = 'footnote-marker';
        marker.contentEditable = 'false';
        marker.innerHTML = `${fnIdx + 1}`;
        marker.title = text.trim();
        marker.dataset.fnIdx = fnIdx;
        const sel = window.getSelection();
        if (sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            range.deleteContents();
            range.insertNode(marker);
            range.setStartAfter(marker);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
        }
        renderFootnotes();
        autosaveBook();
    });
}

function editFootnote(idx) {
    const chapter = book.chapters[book.currentChapter];
    if (!chapter || !chapter.footnotes) return;
    const fn = chapter.footnotes[idx];
    if (!fn) return;
    const newText = prompt('Edit footnote:', fn.text);
    if (newText && newText.trim()) {
        chapter.footnotes[idx].text = newText.trim();
        // Update marker tooltips
        const richEditor = document.getElementById('richEditor');
        const markers = richEditor.querySelectorAll(`.footnote-marker[data-fn-idx="${idx}"]`);
        markers.forEach(m => m.title = newText.trim());
        renderFootnotes();
        autosaveBook();
    }
}

function deleteFootnote(idx) {
    if (!confirm('Delete this footnote? The marker in text will remain.')) return;
    const chapter = book.chapters[book.currentChapter];
    if (!chapter || !chapter.footnotes) return;
    chapter.footnotes.splice(idx, 1);
    renderFootnotes();
    autosaveBook();
}

// Setup References & Footnotes UI
function setupReferencesFootnotesUI() {
    // Add reference button
    const addRefBtn = document.getElementById('addRefBtn');
    if (addRefBtn) {
        addRefBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            addReference();
        });
    }
    
    // Insert footnote button in toolbar
    const insertFootnoteBtn = document.getElementById('insertFootnoteBtn');
    if (insertFootnoteBtn) insertFootnoteBtn.onclick = insertFootnote;
    
    // Insert citation button in toolbar
    const insertCitationBtn = document.getElementById('insertCitationBtn');
    if (insertCitationBtn) {
        insertCitationBtn.onclick = function() {
            if (!book.references || book.references.length === 0) {
                alert('No references added yet. Add a reference first using the References panel in the sidebar.');
                return;
            }
            const refNum = prompt(`Enter reference number (1-${book.references.length}):`);
            const idx = parseInt(refNum, 10) - 1;
            if (isNaN(idx) || idx < 0 || idx >= book.references.length) {
                alert('Invalid reference number.');
                return;
            }
            insertCitationAtCursor(idx);
        };
    }
    
    // Toggle panels - use event delegation to avoid conflicts
    const refsToggle = document.getElementById('refsToggle');
    const refsPanel = document.getElementById('refsPanel');
    if (refsToggle && refsPanel) {
        refsToggle.addEventListener('click', function(e) {
            // Don't toggle if clicking on something inside the panel
            if (e.target.closest('.refs-panel')) return;
            refsToggle.classList.toggle('collapsed');
            refsPanel.style.display = refsToggle.classList.contains('collapsed') ? 'none' : 'block';
            const icon = refsToggle.querySelector('.toggle-icon');
            if (icon) icon.textContent = refsToggle.classList.contains('collapsed') ? '▶' : '▼';
        });
    }
    
    // Toggle panels - chapters
    const chaptersToggle = document.getElementById('chaptersToggle');
    const chaptersPanel = document.getElementById('chaptersPanel');
    if (chaptersToggle && chaptersPanel) {
        chaptersToggle.addEventListener('click', function(e) {
            if (e.target.closest('#chaptersPanel')) return;
            chaptersToggle.classList.toggle('collapsed');
            chaptersPanel.style.display = chaptersToggle.classList.contains('collapsed') ? 'none' : 'block';
            const icon = chaptersToggle.querySelector('.toggle-icon');
            if (icon) icon.textContent = chaptersToggle.classList.contains('collapsed') ? '▶' : '▼';
        });
    }
    
    const footnotesToggle = document.getElementById('footnotesToggle');
    const footnotesPanel = document.getElementById('footnotesPanel');
    if (footnotesToggle && footnotesPanel) {
        footnotesToggle.addEventListener('click', function(e) {
            if (e.target.closest('.footnotes-panel')) return;
            footnotesToggle.classList.toggle('collapsed');
            footnotesPanel.style.display = footnotesToggle.classList.contains('collapsed') ? 'none' : 'block';
            const icon = footnotesToggle.querySelector('.toggle-icon');
            if (icon) icon.textContent = footnotesToggle.classList.contains('collapsed') ? '▶' : '▼';
        });
    }
    
    // Toggle panels - front matter
    const frontMatterToggle = document.getElementById('frontMatterToggle');
    const frontMatterPanel = document.getElementById('frontMatterPanel');
    if (frontMatterToggle && frontMatterPanel) {
        frontMatterToggle.addEventListener('click', function(e) {
            if (e.target.closest('.front-matter-panel')) return;
            frontMatterToggle.classList.toggle('collapsed');
            frontMatterPanel.style.display = frontMatterToggle.classList.contains('collapsed') ? 'none' : 'block';
            const icon = frontMatterToggle.querySelector('.toggle-icon');
            if (icon) icon.textContent = frontMatterToggle.classList.contains('collapsed') ? '▶' : '▼';
        });
    }
    
    // Toggle panels - back matter
    const backMatterToggle = document.getElementById('backMatterToggle');
    const backMatterPanel = document.getElementById('backMatterPanel');
    if (backMatterToggle && backMatterPanel) {
        backMatterToggle.addEventListener('click', function(e) {
            if (e.target.closest('.back-matter-panel')) return;
            backMatterToggle.classList.toggle('collapsed');
            backMatterPanel.style.display = backMatterToggle.classList.contains('collapsed') ? 'none' : 'block';
            const icon = backMatterToggle.querySelector('.toggle-icon');
            if (icon) icon.textContent = backMatterToggle.classList.contains('collapsed') ? '▶' : '▼';
        });
    }
    
    renderReferences();
    renderFootnotes();
    renderFrontMatter();
    renderBackMatter();
}

// Mobile sidebar toggle
function setupMobileSidebar() {
    const toggleBtn = document.getElementById('mobileSidebarToggle');
    const sidebar = document.querySelector('.book-sidebar');
    
    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            toggleBtn.textContent = sidebar.classList.contains('open') ? '✕' : '☰';
        });
        
        // Close sidebar when clicking on editor on mobile
        const editor = document.getElementById('richEditor');
        if (editor) {
            editor.addEventListener('click', () => {
                if (window.innerWidth <= 768 && sidebar.classList.contains('open')) {
                    sidebar.classList.remove('open');
                    toggleBtn.textContent = '☰';
                }
            });
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setupBookEditorUI();
        setupBookFileButtons();
        setupReferencesFootnotesUI();
        setupMobileSidebar();
        setupTagAutocomplete();
        setupBeforeUnloadWarning();
    });
} else {
    setupBookEditorUI();
    setupBookFileButtons();
    setupReferencesFootnotesUI();
    setupMobileSidebar();
    setupTagAutocomplete();
    setupBeforeUnloadWarning();
}

/**
 * Set up warning before leaving with unsaved changes
 */
function setupBeforeUnloadWarning() {
    window.addEventListener('beforeunload', function(e) {
        if (hasUnsavedChanges) {
            e.preventDefault();
            e.returnValue = '';
            return '';
        }
    });
}

// ========================================
// @ TAG AUTOCOMPLETE SYSTEM
// ========================================

// Available tags with their keys and display names
const availableTags = [
    { key: 'company', label: 'Company Name', icon: '🏢' },
    { key: 'tagline', label: 'Tagline', icon: '💬' },
    { key: 'logo', label: 'Logo', icon: '🖼️' },
    { key: 'year', label: 'Copyright Year', icon: '📅' },
    { key: 'copyright', label: 'Copyright Text', icon: '©️' },
    { key: 'email', label: 'Email', icon: '📧' },
    { key: 'phone', label: 'Phone', icon: '📞' },
    { key: 'website', label: 'Website', icon: '🌐' },
    { key: 'address', label: 'Address', icon: '📍' }
];

let tagDropdown = null;
let selectedTagIndex = -1;
let tagSearchStart = -1;
let isTagMode = false;

/**
 * Set up @ tag autocomplete functionality
 */
function setupTagAutocomplete() {
    const richEditor = document.getElementById('richEditor');
    if (!richEditor) {
        return;
    }
    
    // Create dropdown element
    tagDropdown = document.createElement('div');
    tagDropdown.className = 'tag-dropdown';
    tagDropdown.style.display = 'none';
    document.body.appendChild(tagDropdown);
    
    // Listen for @ key using keyup for better detection
    richEditor.addEventListener('keyup', handleTagInputKeyup);
    richEditor.addEventListener('keydown', handleTagKeydown);
    document.addEventListener('click', (e) => {
        if (tagDropdown && !tagDropdown.contains(e.target)) {
            hideTagDropdown();
        }
    });
}

/**
 * Handle keyup events for @ tag detection
 * @param {KeyboardEvent} e - Keyboard event
 */
function handleTagInputKeyup(e) {
    // Check if @ was just typed
    if (e.key === '@' || e.key === 'Shift') {
        // Don't trigger on just Shift
        if (e.key === 'Shift') return;
    }
    
    const richEditor = document.getElementById('richEditor');
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    
    const range = sel.getRangeAt(0);
    let textNode = range.startContainer;
    let cursorPos = range.startOffset;
    
    // Get text content - handle different node types
    let text = '';
    if (textNode.nodeType === Node.TEXT_NODE) {
        text = textNode.textContent;
    } else if (textNode.nodeType === Node.ELEMENT_NODE) {
        // If cursor is in an element, get the text before cursor
        const textContent = textNode.textContent || '';
        text = textContent;
        cursorPos = textContent.length;
    } else {
        hideTagDropdown();
        return;
    }
    
    // Find @ before cursor
    let atIndex = -1;
    for (let i = cursorPos - 1; i >= 0; i--) {
        if (text[i] === '@') {
            atIndex = i;
            break;
        }
        // Stop at whitespace or certain characters
        if (text[i] === ' ' || text[i] === '\n' || text[i] === '\t') break;
    }
    
    if (atIndex === -1) {
        hideTagDropdown();
        return;
    }
    
    const query = text.substring(atIndex + 1, cursorPos).toLowerCase();
    tagSearchStart = atIndex;
    isTagMode = true;
    
    // Filter tags - show all if query is empty (just typed @)
    const matches = availableTags.filter(tag => 
        query === '' ||
        tag.key.toLowerCase().includes(query) || 
        tag.label.toLowerCase().includes(query)
    );
    
    if (matches.length === 0) {
        hideTagDropdown();
        return;
    }
    
    showTagDropdown(matches);
}

/**
 * Show the tag dropdown with matching options
 * @param {Array} matches - Matching tag options
 */
function showTagDropdown(matches) {
    const richEditor = document.getElementById('richEditor');
    const sel = window.getSelection();
    
    // Get caret position for dropdown placement
    let rect;
    if (sel.rangeCount > 0) {
        const range = sel.getRangeAt(0).cloneRange();
        range.collapse(true);
        
        // Try to get rect from range
        const rects = range.getClientRects();
        if (rects.length > 0) {
            rect = rects[0];
        } else {
            // Fallback: use editor position
            rect = richEditor.getBoundingClientRect();
        }
    } else {
        rect = richEditor.getBoundingClientRect();
    }
    
    // Position dropdown
    tagDropdown.style.position = 'fixed';
    tagDropdown.style.left = Math.max(10, rect.left - 10) + 'px';
    tagDropdown.style.top = (rect.bottom + 8) + 'px';
    
    // Render options
    tagDropdown.innerHTML = matches.map((tag, idx) => {
        const setup = JSON.parse(localStorage.getItem(APP_CONFIG.SETUP_KEY) || '{}');
        const keyMap = {
            'company': 'companyName',
            'tagline': 'companyTagline',
            'year': 'copyrightYear',
            'copyright': 'copyrightText',
            'email': 'contactEmail',
            'phone': 'contactPhone',
            'website': 'website',
            'address': 'address',
            'logo': 'logo'
        };
        const value = setup[keyMap[tag.key]] || '';
        const preview = value && !value.startsWith('data:') 
            ? ` — ${value.substring(0, 25)}${value.length > 25 ? '...' : ''}` 
            : (value ? ' ✓' : ' (not set)');
        return `<div class="tag-option${idx === selectedTagIndex ? ' selected' : ''}" data-key="${tag.key}">
            <span class="tag-icon">${tag.icon}</span>
            <span class="tag-label">${tag.label}</span>
            <span class="tag-preview">${preview}</span>
        </div>`;
    }).join('');
    
    // Add click handlers
    tagDropdown.querySelectorAll('.tag-option').forEach((el, idx) => {
        el.addEventListener('click', () => insertTag(matches[idx].key));
        el.addEventListener('mouseenter', () => {
            selectedTagIndex = idx;
            updateTagSelection();
        });
    });
    
    selectedTagIndex = 0;
    updateTagSelection();
    tagDropdown.style.display = 'block';
}

/**
 * Hide the tag dropdown
 */
function hideTagDropdown() {
    if (tagDropdown) {
        tagDropdown.style.display = 'none';
    }
    selectedTagIndex = -1;
    tagSearchStart = -1;
    isTagMode = false;
}

/**
 * Update visual selection in tag dropdown
 */
function updateTagSelection() {
    if (!tagDropdown) return;
    tagDropdown.querySelectorAll('.tag-option').forEach((el, idx) => {
        el.classList.toggle('selected', idx === selectedTagIndex);
    });
}

/**
 * Handle keyboard navigation in tag dropdown
 * @param {KeyboardEvent} e - Keyboard event
 */
function handleTagKeydown(e) {
    // Check if tag dropdown is visible
    if (!tagDropdown || tagDropdown.style.display === 'none' || !isTagMode) return;
    
    const options = tagDropdown.querySelectorAll('.tag-option');
    if (options.length === 0) return;
    
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        selectedTagIndex = (selectedTagIndex + 1) % options.length;
        updateTagSelection();
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        selectedTagIndex = (selectedTagIndex - 1 + options.length) % options.length;
        updateTagSelection();
    } else if (e.key === 'Enter' || e.key === 'Tab') {
        if (selectedTagIndex >= 0 && options[selectedTagIndex]) {
            e.preventDefault();
            e.stopPropagation();
            const key = options[selectedTagIndex].dataset.key;
            insertTag(key);
        }
    } else if (e.key === 'Escape') {
        e.preventDefault();
        hideTagDropdown();
    } else if (e.key === ' ' || e.key === 'Backspace') {
        // Hide on space or if backspace removes the @
        setTimeout(() => {
            const sel = window.getSelection();
            if (!sel.rangeCount) return;
            const range = sel.getRangeAt(0);
            const textNode = range.startContainer;
            if (textNode.nodeType === Node.TEXT_NODE) {
                const text = textNode.textContent;
                const pos = range.startOffset;
                let hasAt = false;
                for (let i = pos - 1; i >= 0; i--) {
                    if (text[i] === '@') { hasAt = true; break; }
                    if (text[i] === ' ' || text[i] === '\n') break;
                }
                if (!hasAt) hideTagDropdown();
            }
        }, 0);
    }
}

/**
 * Insert the selected tag value into the editor
 * @param {string} key - Tag key to insert
 */
function insertTag(key) {
    const richEditor = document.getElementById('richEditor');
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    
    const range = sel.getRangeAt(0);
    const textNode = range.startContainer;
    
    if (textNode.nodeType !== Node.TEXT_NODE) return;
    
    const text = textNode.textContent;
    const cursorPos = range.startOffset;
    
    // Find @ position
    let atIndex = tagSearchStart;
    if (atIndex === -1) {
        for (let i = cursorPos - 1; i >= 0; i--) {
            if (text[i] === '@') {
                atIndex = i;
                break;
            }
        }
    }
    
    if (atIndex === -1) return;
    
    // Get the actual value from setup
    const setup = JSON.parse(localStorage.getItem(APP_CONFIG.SETUP_KEY) || '{}');
    const keyMap = {
        'company': 'companyName',
        'tagline': 'companyTagline',
        'year': 'copyrightYear',
        'copyright': 'copyrightText',
        'email': 'contactEmail',
        'phone': 'contactPhone',
        'website': 'website',
        'address': 'address',
        'logo': 'logo'
    };
    
    const value = setup[keyMap[key]] || `{{${key}}}`;
    
    // Replace @query with value or tag placeholder
    const before = text.substring(0, atIndex);
    const after = text.substring(cursorPos);
    
    // For logo, insert an image element
    if (key === 'logo' && setup.logo) {
        textNode.textContent = before + after;
        const img = document.createElement('img');
        img.src = setup.logo;
        img.alt = 'Logo';
        img.style.maxHeight = '1.5em';
        img.style.verticalAlign = 'middle';
        img.className = 'inline-tag-logo';
        
        const newRange = document.createRange();
        newRange.setStart(textNode, atIndex);
        newRange.collapse(true);
        newRange.insertNode(img);
        
        // Move cursor after image
        newRange.setStartAfter(img);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
    } else {
        // Insert text value
        const displayValue = value.startsWith('{{') ? value : value;
        textNode.textContent = before + displayValue + after;
        
        // Move cursor to end of inserted text
        const newRange = document.createRange();
        newRange.setStart(textNode, before.length + displayValue.length);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
    }
    
    hideTagDropdown();
    richEditor.focus();
}

// ========================================
// TAG DROPDOWN STYLES
// ========================================

/**
 * Inject CSS styles for tag dropdown (IIFE)
 */
(function() {
    const style = document.createElement('style');
    style.textContent = `
        .tag-dropdown {
            background: #fff;
            border: 1px solid #d2d2d7;
            border-radius: 8px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.2);
            min-width: 280px;
            max-width: 380px;
            z-index: 10000;
            overflow: hidden;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        .tag-option {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 14px;
            cursor: pointer;
            font-size: 13px;
            border-bottom: 1px solid #f0f0f0;
        }
        .tag-option:last-child {
            border-bottom: none;
        }
        .tag-option:hover, .tag-option.selected {
            background: #e8f0fe;
        }
        .tag-icon {
            font-size: 16px;
            width: 24px;
            text-align: center;
        }
        .tag-label {
            font-weight: 500;
            color: #1d1d1f;
        }
        .tag-preview {
            color: #86868b;
            font-size: 11px;
            margin-left: auto;
            max-width: 120px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .inline-tag-logo {
            max-height: 1.5em;
            vertical-align: middle;
            margin: 0 2px;
        }
    `;
    document.head.appendChild(style);
})();

// ========================================
// WORD EXPORT FUNCTIONALITY
// ========================================

/**
 * Convert a Blob to Base64 string
 */
function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            // Remove data URL prefix to get pure base64
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}



/**
 * Parse inline formatting from an HTML element and return TextRun array
 */
function parseInlineFormatting(element, baseOptions = {}) {
    const { TextRun } = docx;
    const runs = [];
    
    function processNode(node, currentStyle = {}) {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent;
            if (text) {
                runs.push(new TextRun({
                    text: text,
                    size: currentStyle.size || 24,
                    bold: currentStyle.bold || false,
                    italics: currentStyle.italics || false,
                    underline: currentStyle.underline ? {} : undefined,
                    strike: currentStyle.strike || false,
                    color: currentStyle.color,
                    ...baseOptions
                }));
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            const tag = node.tagName.toLowerCase();
            const newStyle = { ...currentStyle };
            
            // Apply formatting based on tag
            if (tag === 'b' || tag === 'strong') newStyle.bold = true;
            if (tag === 'i' || tag === 'em') newStyle.italics = true;
            if (tag === 'u') newStyle.underline = true;
            if (tag === 's' || tag === 'strike' || tag === 'del') newStyle.strike = true;
            
            // Check for inline styles
            const style = node.style;
            if (style) {
                if (style.fontWeight === 'bold' || parseInt(style.fontWeight) >= 700) newStyle.bold = true;
                if (style.fontStyle === 'italic') newStyle.italics = true;
                if (style.textDecoration && style.textDecoration.includes('underline')) newStyle.underline = true;
                if (style.textDecoration && style.textDecoration.includes('line-through')) newStyle.strike = true;
                if (style.color) {
                    // Convert color to hex if needed
                    const color = style.color;
                    if (color.startsWith('rgb')) {
                        const rgb = color.match(/\d+/g);
                        if (rgb && rgb.length >= 3) {
                            newStyle.color = ((1 << 24) + (parseInt(rgb[0]) << 16) + (parseInt(rgb[1]) << 8) + parseInt(rgb[2])).toString(16).slice(1);
                        }
                    } else if (color.startsWith('#')) {
                        newStyle.color = color.slice(1);
                    }
                }
            }
            
            // Process children
            for (const child of node.childNodes) {
                processNode(child, newStyle);
            }
        }
    }
    
    for (const child of element.childNodes) {
        processNode(child);
    }
    
    // If no runs were created, add empty text
    if (runs.length === 0) {
        runs.push(new TextRun({ text: '', size: 24 }));
    }
    
    return runs;
}

/**
 * Export editor content to Word document (.docx)
 */
async function exportToWord() {
    try {
        // Check if docx library is loaded
        if (typeof docx === 'undefined') {
            alert('Word export library not loaded. Please refresh the page.');
            return;
        }
        
        const richEditor = document.getElementById('richEditor');
        if (!richEditor || !richEditor.innerHTML.trim()) {
            alert('No content to export. Please write something first.');
            return;
        }
        
        const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = docx;
        
        // Get book title
        const titleEl = document.getElementById('sidebarBookTitle');
        const bookTitle = titleEl ? titleEl.textContent : 'Untitled Book';
        
        // Convert HTML to paragraphs
        const children = [];
        
        // Add title
        children.push(
            new Paragraph({
                children: [new TextRun({ text: bookTitle, bold: true, size: 48 })],
                alignment: AlignmentType.CENTER,
                spacing: { after: 600 }
            })
        );
        
        // Parse editor content
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = richEditor.innerHTML;
        
        // Process each block element
        const blocks = tempDiv.querySelectorAll('p, div, h1, h2, h3, h4, li, blockquote');
        
        if (blocks.length === 0) {
            // No block elements, treat entire content as one paragraph
            const textRuns = parseInlineFormatting(tempDiv);
            children.push(new Paragraph({
                children: textRuns,
                spacing: { after: 200 }
            }));
        } else {
            blocks.forEach(block => {
                const tagName = block.tagName.toLowerCase();
                
                // Skip empty blocks
                if (!block.textContent.trim()) return;
                
                let heading = null;
                let baseSize = 24;
                if (tagName === 'h1') { heading = HeadingLevel.HEADING_1; baseSize = 36; }
                else if (tagName === 'h2') { heading = HeadingLevel.HEADING_2; baseSize = 32; }
                else if (tagName === 'h3') { heading = HeadingLevel.HEADING_3; baseSize = 28; }
                
                // Parse inline formatting within the block
                const textRuns = parseInlineFormatting(block, { size: baseSize });
                
                // Determine alignment
                let alignment = AlignmentType.LEFT;
                const textAlign = block.style.textAlign || window.getComputedStyle(block).textAlign;
                if (textAlign === 'center') alignment = AlignmentType.CENTER;
                else if (textAlign === 'right') alignment = AlignmentType.RIGHT;
                else if (textAlign === 'justify') alignment = AlignmentType.JUSTIFIED;
                
                children.push(new Paragraph({
                    children: textRuns,
                    heading: heading,
                    alignment: alignment,
                    spacing: { after: heading ? 300 : 200 }
                }));
            });
        }
        
        // Create document
        const doc = new Document({
            sections: [{
                properties: {},
                children: children
            }]
        });
        
        // Generate blob
        const blob = await Packer.toBlob(doc);
        const filename = `${bookTitle.replace(/[^a-z0-9]/gi, '_')}.docx`;
        
        // Browser fallback: use download link
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log('Word export successful (browser mode)');
        
    } catch (err) {
        console.error('Word export error:', err);
        alert('Export failed: ' + err.message);
    }
}

// ========================================
// THEME TOGGLE FUNCTIONALITY
// ========================================

const THEME_KEY = 'burushaski_editor_theme';

/**
 * Initialize theme from localStorage or default to light
 */
function initTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
    applyTheme(savedTheme);
}

/**
 * Apply theme to document
 * @param {string} theme - 'light' or 'dim'
 */
function applyTheme(theme) {
    if (theme === 'dim') {
        document.documentElement.setAttribute('data-theme', 'dim');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
    updateThemeToggleIcon(theme);
    localStorage.setItem(THEME_KEY, theme);
}

/**
 * Toggle between light and dim theme
 */
function toggleTheme() {
    const currentTheme = localStorage.getItem(THEME_KEY) || 'light';
    const newTheme = currentTheme === 'light' ? 'dim' : 'light';
    applyTheme(newTheme);
}

/**
 * Update theme toggle button icon
 * @param {string} theme - current theme
 */
function updateThemeToggleIcon(theme) {
    const toggleBtn = document.getElementById('themeToggle');
    if (toggleBtn) {
        toggleBtn.textContent = theme === 'dim' ? '☀️' : '🌙';
        toggleBtn.title = theme === 'dim' ? 'Switch to Light Mode' : 'Switch to Dim Mode';
    }
}

// Initialize theme on load
initTheme();

// Initialize text direction on load
initTextDirection();

// ========================================
// FILE IMPORT FUNCTIONALITY
// ========================================

/**
 * Handle import button click - open file picker for txt, docx, doc
 */
async function handleImportClick() {
    if (window.showOpenFilePicker) {
        try {
            const [fileHandle] = await window.showOpenFilePicker({
                types: [
                    {
                        description: 'Text & Word Documents',
                        accept: {
                            'text/plain': ['.txt'],
                            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
                            'application/msword': ['.doc']
                        }
                    }
                ]
            });
            const file = await fileHandle.getFile();
            await importFile(file);
        } catch (err) {
            if (err.name !== 'AbortError') {
                alert('Failed to import: ' + err.message);
            }
        }
    } else {
        // Fallback for browsers without File System Access API
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.txt,.docx,.doc';
        input.onchange = async (e) => {
            if (e.target.files && e.target.files[0]) {
                await importFile(e.target.files[0]);
            }
        };
        input.click();
    }
}

/**
 * Import a file and paste content into current paragraph
 * @param {File} file - The file to import
 */
async function importFile(file) {
    const fileName = file.name.toLowerCase();
    const richEditor = document.getElementById('richEditor');
    
    if (!richEditor) {
        alert('Editor not ready. Please try again.');
        return;
    }
    
    try {
        let content = '';
        
        if (fileName.endsWith('.txt')) {
            // Plain text file
            content = await readTextFile(file);
            // Convert plain text to HTML (preserve line breaks)
            content = escapeHtml(content).replace(/\n/g, '<br>');
            
        } else if (fileName.endsWith('.docx')) {
            // Word document (.docx) - use mammoth.js
            content = await readDocxFile(file);
            
        } else if (fileName.endsWith('.doc')) {
            // Old Word format (.doc) - not directly supported
            alert('The .doc format (Word 97-2003) is not directly supported.\n\nPlease save your document as .docx in Microsoft Word first, then import it.');
            return;
            
        } else {
            alert('Unsupported file format. Please use .txt, .docx, or .doc files.');
            return;
        }
        
        if (content) {
            // Ask user how to import
            const importMode = await showImportModeDialog();
            
            if (importMode === 'paste') {
                // Paste at cursor position
                pasteContentAtCursor(content);
            } else if (importMode === 'replace') {
                // Replace current paragraph content
                richEditor.innerHTML = content;
            } else if (importMode === 'new-chapter') {
                // Create new chapter with imported content
                const chapterTitle = file.name.replace(/\.(txt|docx|doc)$/i, '');
                book.chapters.push({
                    title: chapterTitle,
                    paragraphs: [{ title: 'Paragraph 1', content: content }]
                });
                book.currentChapter = book.chapters.length - 1;
                book.currentParagraph = 0;
                renderChapters();
                selectChapter(book.currentChapter, 0);
            }
            
            autosaveBook();
        }
        
    } catch (err) {
        console.error('Import error:', err);
        alert('Failed to import file: ' + err.message);
    }
}

/**
 * Read a plain text file
 * @param {File} file - Text file
 * @returns {Promise<string>} File content
 */
function readTextFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => reject(new Error('Failed to read text file'));
        reader.readAsText(file);
    });
}

/**
 * Read a Word document (.docx) using mammoth.js
 * @param {File} file - Docx file
 * @returns {Promise<string>} HTML content
 */
async function readDocxFile(file) {
    if (typeof mammoth === 'undefined') {
        throw new Error('Word import library not loaded. Please check your internet connection and refresh.');
    }
    
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer: arrayBuffer });
    
    if (result.messages && result.messages.length > 0) {
        console.warn('Mammoth warnings:', result.messages);
    }
    
    return result.value;
}

/**
 * Show import mode dialog
 * @returns {Promise<string>} 'paste', 'replace', 'new-chapter', or null
 */
function showImportModeDialog() {
    return new Promise((resolve) => {
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            inset: 0;
            background: var(--bg-overlay, rgba(0,0,0,0.5));
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
        `;
        
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: var(--bg-card, #fff);
            border-radius: 12px;
            padding: 24px;
            min-width: 300px;
            max-width: 400px;
            box-shadow: var(--shadow-heavy, 0 8px 24px rgba(0,0,0,0.2));
        `;
        
        dialog.innerHTML = `
            <h3 style="margin: 0 0 16px; color: var(--text-primary, #1d1d1f); font-size: 18px;">Import Options</h3>
            <p style="margin: 0 0 20px; color: var(--text-secondary, #555); font-size: 14px;">How would you like to import this content?</p>
            <div style="display: flex; flex-direction: column; gap: 10px;">
                <button id="importPaste" style="padding: 12px 16px; border: 1px solid var(--border-primary, #e0e0e0); border-radius: 8px; background: var(--bg-secondary, #f5f5f7); color: var(--text-primary, #1d1d1f); cursor: pointer; text-align: left;">
                    <strong>📋 Paste at cursor</strong><br>
                    <small style="color: var(--text-tertiary, #86868b);">Insert content where your cursor is</small>
                </button>
                <button id="importReplace" style="padding: 12px 16px; border: 1px solid var(--border-primary, #e0e0e0); border-radius: 8px; background: var(--bg-secondary, #f5f5f7); color: var(--text-primary, #1d1d1f); cursor: pointer; text-align: left;">
                    <strong>🔄 Replace current paragraph</strong><br>
                    <small style="color: var(--text-tertiary, #86868b);">Replace all content in current paragraph</small>
                </button>
                <button id="importNewChapter" style="padding: 12px 16px; border: 1px solid var(--border-primary, #e0e0e0); border-radius: 8px; background: var(--bg-secondary, #f5f5f7); color: var(--text-primary, #1d1d1f); cursor: pointer; text-align: left;">
                    <strong>📑 Create new chapter</strong><br>
                    <small style="color: var(--text-tertiary, #86868b);">Add as a new chapter in your book</small>
                </button>
                <button id="importCancel" style="padding: 10px 16px; border: none; border-radius: 8px; background: transparent; color: var(--text-tertiary, #86868b); cursor: pointer; margin-top: 8px;">
                    Cancel
                </button>
            </div>
        `;
        
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        // Add event listeners
        dialog.querySelector('#importPaste').onclick = () => {
            document.body.removeChild(overlay);
            resolve('paste');
        };
        dialog.querySelector('#importReplace').onclick = () => {
            document.body.removeChild(overlay);
            resolve('replace');
        };
        dialog.querySelector('#importNewChapter').onclick = () => {
            document.body.removeChild(overlay);
            resolve('new-chapter');
        };
        dialog.querySelector('#importCancel').onclick = () => {
            document.body.removeChild(overlay);
            resolve(null);
        };
        overlay.onclick = (e) => {
            if (e.target === overlay) {
                document.body.removeChild(overlay);
                resolve(null);
            }
        };
    });
}

/**
 * Paste HTML content at current cursor position
 * @param {string} html - HTML content to paste
 */
function pasteContentAtCursor(html) {
    const richEditor = document.getElementById('richEditor');
    if (!richEditor) return;
    
    richEditor.focus();
    
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        
        // Create a temporary container
        const temp = document.createElement('div');
        temp.innerHTML = html;
        
        // Insert nodes
        const fragment = document.createDocumentFragment();
        while (temp.firstChild) {
            fragment.appendChild(temp.firstChild);
        }
        range.insertNode(fragment);
        
        // Move cursor to end of inserted content
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
    } else {
        // No selection, append to end
        richEditor.innerHTML += html;
    }
}

// ========================================
// IPA MAPPING (Orthography → IPA)
// ========================================
const IPA_MAPPINGS = {
    // Consonants
    'b': 'b', 'd': 'd', 'j': 'dʑ', 'ḍ': 'ɖ', 'g': 'g', 'ġ': 'ɣ', 'h': 'ɦ',
    'y': 'j', 'k': 'k', 'l': 'l', 'lʰ': 'lʰ', 'll': 'ɫ', 'm': 'm', 'n': 'n',
    'ṅ': 'ŋ', 'p': 'p', 'q': 'q', 'x': 'qʰ', 'r': 'ɾ', 's': 's', 'ṣ': 'ʂ',
    'ś': 'ʃ', 't': 't̪', 'c': 'ts', 'ć': 'tʃ', 'ṭ': 'ʈ', 'c̣': 'ʈʂ',
    'w': 'w', 'z': 'z', 'ẓ': 'ʐ', 'gh': 'ɣ', 'sh':'ʃ',

    // Vowels
    'a': 'a', 'aa': 'ɑː', 'ẽ': 'ẽ', 'ee': 'eː', 'e': 'ɛ',
    'i': 'ɪ', 'ii': 'iː', 'o': 'o', 'oo': 'oː', 'u': 'ʊ', 'uu': 'uː',
    'á': 'ʌ'
};
const sortedMappingKeys = Object.keys(IPA_MAPPINGS).sort((a, b) => b.length - a.length);
function convertToIPA(word) {
    if (!word) return '';
    let result = '';
    let i = 0;
    const lowerWord = word.toLowerCase();
    while (i < lowerWord.length) {
        let matched = false;
        for (const key of sortedMappingKeys) {
            if (lowerWord.substring(i, i + key.length) === key) {
                result += IPA_MAPPINGS[key];
                i += key.length;
                matched = true;
                break;
            }
        }
        if (!matched) {
            result += lowerWord[i];
            i++;
        }
    }
    return result;
}

// ========================================
// IPA CONTEXT MENU FOR EDITOR
// ========================================
let ipaMenu;
function createIPAMenu() {
    if (ipaMenu) return ipaMenu;
    ipaMenu = document.createElement('div');
    ipaMenu.className = 'ipa-context-menu';
    ipaMenu.innerHTML = ``;
    document.body.appendChild(ipaMenu);
    return ipaMenu;
}
function showIPAMenu(x, y) {
    createIPAMenu();
    ipaMenu.style.left = x + 'px';
    ipaMenu.style.top = y + 'px';
    ipaMenu.style.display = 'block';
}
function hideIPAMenu() {
    if (ipaMenu) ipaMenu.style.display = 'none';
}
document.addEventListener('click', hideIPAMenu);

// Context menu event for editor
if (editor) {
    editor.addEventListener('contextmenu', function(e) {
        const sel = window.getSelection();
        if (sel && !sel.isCollapsed && sel.rangeCount > 0 && editor.contains(sel.anchorNode)) {
            e.preventDefault();
            showIPAMenu(e.clientX, e.clientY);
        } else {
            hideIPAMenu();
        }
    });
}
document.addEventListener('DOMContentLoaded', function() {
    // Intercept Info/View links for Electron navigation
    document.querySelectorAll('a.mega-menu-trigger').forEach(function(link) {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            if (link.href) {
                window.location.href = link.getAttribute('href');
            }
        });
    });
    if (!editor) editor = document.getElementById('richEditor') || document.getElementById('editor');
    if (editor) {
        editor.addEventListener('contextmenu', function(e) {
            const sel = window.getSelection();
            if (sel && !sel.isCollapsed && sel.rangeCount > 0 && editor.contains(sel.anchorNode)) {
                e.preventDefault();
                showIPAMenu(e.clientX, e.clientY);
            } else {
                hideIPAMenu();
            }
        });
    }
    createIPAMenu();
});
