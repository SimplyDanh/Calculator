// services/app.js

/* Formatter for professional decimal format */
const proFormatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4
});

/* --- Dynamic Left Panel Logic --- */

const ROW_TEMPLATES = {
    'type1': `
                <div class="input-group">
                    <input type="number" class="val-x" placeholder="X" step="any">
                    <span>is what % of</span>
                    <input type="number" class="val-y" placeholder="Y" step="any">
                </div>
            `,
    'type2': `
                <div class="input-group">
                    <span>What is</span>
                    <input type="number" class="val-x" placeholder="X %" step="any">
                    <span>% of</span>
                    <input type="number" class="val-y" placeholder="Y" step="any">
                </div>
            `,
    'type3': `
                <div class="input-group">
                    <span>Change from</span>
                    <input type="number" class="val-x" placeholder="X" step="any">
                    <span>to</span>
                    <input type="number" class="val-y" placeholder="Y" step="any">
                </div>
            `,
    'type4': `
                <div class="input-group">
                    <input type="number" class="val-x" placeholder="X" step="any">
                    <span>is</span>
                    <input type="number" class="val-y" placeholder="P %" step="any">
                    <span>% of what?</span>
                </div>
            `
};

function calculateRowResult(type, x, y) {
    let resText = '0.00';
    if (x === null || y === null || isNaN(x) || isNaN(y)) {
        return (type === 'type1' || type === 'type3') ? '0.00%' : '0.00';
    }

    switch (type) {
        case 'type1':
            if (y !== 0) resText = proFormatter.format((x / y) * 100) + '%';
            else resText = '0.00%';
            break;
        case 'type2':
            resText = proFormatter.format((x / 100) * y);
            break;
        case 'type3':
            if (x !== 0) {
                const res = ((y - x) / Math.abs(x)) * 100;
                const sign = res > 0 ? '+' : '';
                resText = sign + proFormatter.format(res) + '%';
            } else resText = '0.00%';
            break;
        case 'type4':
            if (y !== 0) resText = proFormatter.format(x / (y / 100));
            else resText = '0.00';
            break;
    }
    return resText;
}

function createRow(type) {
    const container = document.createElement('div');
    container.className = 'calc-row-instance';

    const uniqueId = 'res-' + Math.random().toString(36).substring(2, 9);

    container.innerHTML = `
                ${ROW_TEMPLATES[type]}
                <div class="result-group">
                    <span>Result:</span>
                    <span class="result-value" id="${uniqueId}">${(type === 'type1' || type === 'type3') ? '0.00%' : '0.00'}</span>
                    <button class="icon-btn copy-row-btn" title="Copy to clipboard" aria-label="Copy result">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                    </button>
                    <button class="icon-btn delete-row-btn" title="Delete Row" aria-label="Delete row">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
            `;

    // Bind copy and delete via addEventListener (no inline onclick)
    container.querySelector('.copy-row-btn').addEventListener('click', function () {
        copyResult(uniqueId);
    });
    container.querySelector('.delete-row-btn').addEventListener('click', function () {
        deleteRow(this);
    });

    // Setup listeners
    const xInput = container.querySelector('.val-x');
    const yInput = container.querySelector('.val-y');
    const resEl = container.querySelector('.result-value');

    const updater = () => {
        const xVal = parseFloat(xInput.value);
        const yVal = parseFloat(yInput.value);
        resEl.textContent = calculateRowResult(type,
            isNaN(xVal) ? null : xVal,
            isNaN(yVal) ? null : yVal
        );
    };

    xInput.addEventListener('input', updater);
    yInput.addEventListener('input', updater);

    return container;
}

function addRow(btnEl, type) {
    const container = btnEl.closest('.calc-card').querySelector('.calc-rows-container');
    const newRow = createRow(type);
    container.appendChild(newRow);

    // Re-evaluate if only 1 child exists to hide delete button optionally, 
    // but we'll always show it for simplicity if user explicitly wants to manage them.
    // If they delete all, they can always press "Add Row" again.
}

function deleteRow(btnEl) {
    const rowInstance = btnEl.closest('.calc-row-instance');
    rowInstance.remove();
}

/* --- State Persistence (localStorage) --- */
// In-memory store for structured audit entries (used for safe save/restore)
let auditEntries = [];

function saveState() {
    const state = {
        theme: Array.from(document.body.classList).find(c => c.startsWith('theme-')) || '',
        darkMode: document.body.classList.contains('dark-theme'),
        mode: document.body.classList.contains('scientific-mode') ? 'scientific' : 'standard',
        cards: {},
        sciRows: [],
        auditData: auditEntries
    };

    document.querySelectorAll('.calc-card').forEach(card => {
        const type = card.getAttribute('data-type');
        state.cards[type] = Array.from(card.querySelectorAll('.calc-row-instance')).map(row => {
            return {
                x: row.querySelector('.val-x').value,
                y: row.querySelector('.val-y').value
            };
        });
    });

    document.querySelectorAll('math-field').forEach(mf => {
        state.sciRows.push(mf.value);
    });

    localStorage.setItem('interactiveCalcState', JSON.stringify(state));
}

function loadState() {
    const saved = localStorage.getItem('interactiveCalcState');
    if (!saved) return false;

    try {
        const state = JSON.parse(saved);

        // Restore Theme
        if (state.darkMode && !document.body.classList.contains('dark-theme')) toggleTheme();
        if (!state.darkMode && document.body.classList.contains('dark-theme')) toggleTheme();

        // Force sync toggle switch visually upon loading
        const checkbox = document.getElementById('checkbox');
        if (checkbox) checkbox.checked = state.darkMode;

        if (state.theme) {
            const btn = document.querySelector('.theme-swatch[data-theme="' + state.theme + '"]');
            if (btn) setThemeColor(btn, state.theme);
        }

        // Restore Mode
        if (state.mode === 'scientific') setCalcMode('scientific');

        // Restore Audit Tape from structured data (safe — no innerHTML)
        if (state.auditData && Array.isArray(state.auditData)) {
            // Rebuild entries in reverse so prepend order matches original
            state.auditData.slice().reverse().forEach(entry => {
                if (typeof entry.a === 'number' && typeof entry.b === 'number' &&
                    typeof entry.op === 'string' && typeof entry.res === 'number' &&
                    isFinite(entry.a) && isFinite(entry.b) && isFinite(entry.res)) {
                    addAuditEntry(entry.a, entry.b, entry.op, entry.res);
                }
            });
        }

        // Restore Percentage Cards
        for (const type in state.cards) {
            const card = document.querySelector(`.calc-card[data-type="${type}"]`);
            if (card) {
                const container = card.querySelector('.calc-rows-container');
                container.replaceChildren();
                if (state.cards[type].length === 0) {
                    container.appendChild(createRow(type));
                } else {
                    state.cards[type].forEach(rowData => {
                        const newRow = createRow(type);
                        const x = newRow.querySelector('.val-x');
                        const y = newRow.querySelector('.val-y');
                        x.value = rowData.x || '';
                        y.value = rowData.y || '';
                        container.appendChild(newRow);
                        x.dispatchEvent(new Event('input'));
                    });
                }
            }
        }

        // Restore Scientific Rows
        if (state.sciRows && state.sciRows.length > 0) {
            const sciWrapper = document.getElementById('sci-rows-wrapper');
            if (sciWrapper) {
                sciWrapper.replaceChildren();
                state.sciRows.forEach((val, index) => {
                    addScientificRow();
                    setTimeout(() => {
                        const mfs = document.querySelectorAll('math-field');
                        if (mfs[index]) {
                            mfs[index].value = val;
                            mfs[index].dispatchEvent(new Event('input', { bubbles: true }));
                        }
                    }, 100);
                });
            }
        }

        return true;
    } catch (e) {
        console.error("Failed to load calc state", e);
        return false;
    }
}

// Setup auto-save triggers
let saveTimeout;
function triggerSave() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveState, 500);
}
document.addEventListener('input', triggerSave);
// Save on button clicks (theme toggles, add row, etc)
document.addEventListener('click', (e) => {
    if (e.target.closest('button')) triggerSave();
});

// Initialize with 1 row for each card OR load from storage
window.addEventListener('DOMContentLoaded', () => {
    const loaded = loadState();
    if (!loaded) {
        document.querySelectorAll('.calc-card').forEach(card => {
            const type = card.getAttribute('data-type');
            const container = card.querySelector('.calc-rows-container');
            container.appendChild(createRow(type));
        });
    }

    // --- Enhancement 1: Entrance Animations ---
    const header = document.querySelector('.left-panel header');
    if (header) {
        header.classList.add('anim-fade-up');
        header.style.animationDelay = '0.05s';
    }
    document.querySelectorAll('.calc-card').forEach((card, i) => {
        card.classList.add('anim-fade-up');
        card.style.animationDelay = `${0.1 + (i * 0.08)}s`;
    });
    const rightPanel = document.querySelector('.right-panel');
    if (rightPanel) {
        rightPanel.classList.add('anim-slide-right');
        rightPanel.style.animationDelay = '0.1s';
    }

    // --- Enhancement 4: Dynamic Accessibility Attributes ---
    document.querySelectorAll('button[title]:not([aria-label])').forEach(btn => {
        btn.setAttribute('aria-label', btn.getAttribute('title'));
    });
});


/* --- Global Calculator State --- */
let calcState = {
    currentValue: '0',
    previousValue: null,
    operator: null,
    resetNext: false,
    memoryValue: 0
};

const displayEl = document.getElementById('main-calc-display');
const previewEl = document.getElementById('main-calc-prev');
const auditList = document.getElementById('audit-list');

function updateDisplay() {
    let hasDot = calcState.currentValue.endsWith('.');
    let targetVal = parseFloat(calcState.currentValue);
    if (isNaN(targetVal)) targetVal = 0;

    // Instant update
    let formatted = proFormatter.format(targetVal);
    if (hasDot) formatted += '.';
    displayEl.textContent = formatted;

    if (calcState.previousValue !== null && calcState.operator) {
        let opStr = calcState.operator;
        if (opStr === '*') opStr = '×';
        if (opStr === '/') opStr = '÷';
        if (opStr === '-') opStr = '−';
        previewEl.textContent = `${proFormatter.format(calcState.previousValue)} ${opStr}`;
    } else {
        previewEl.textContent = '';
    }
}

function calcDigit(digit) {
    if (calcState.resetNext) {
        calcState.currentValue = digit;
        calcState.resetNext = false;
    } else {
        // Input length guard — prevent overflow from unlimited digit entry
        if (calcState.currentValue.replace(/[^0-9]/g, '').length >= 15) return;

        if (digit === '.') {
            if (!calcState.currentValue.includes('.')) {
                calcState.currentValue += '.';
            }
        } else {
            if (calcState.currentValue === '0' || calcState.currentValue === '-0') {
                calcState.currentValue = calcState.currentValue.startsWith('-') ? '-' + digit : digit;
            } else {
                calcState.currentValue += digit;
            }
        }
    }
    updateDisplay();
}

function calcAction(action) {
    if (action === 'clear') {
        calcState.currentValue = '0';
        calcState.previousValue = null;
        calcState.operator = null;
        calcState.resetNext = false;
        document.getElementById('main-calc-prev').textContent = '';
        updateDisplay();
    } else if (action === 'backspace') {
        if (calcState.resetNext) return;
        calcState.currentValue = calcState.currentValue.slice(0, -1);
        if (calcState.currentValue === '' || calcState.currentValue === '-') {
            calcState.currentValue = '0';
        }
        updateDisplay();
    }
}

function calcMemory(action) {
    const val = parseFloat(calcState.currentValue);

    if (action === 'MC') {
        calcState.memoryValue = 0;
        showToast("Memory Cleared");
    } else if (action === 'MR') {
        calcState.currentValue = calcState.memoryValue.toString();
        calcState.resetNext = true;
        updateDisplay();
        showToast("Memory Recalled: " + proFormatter.format(calcState.memoryValue));
    } else if (action === 'M+') {
        if (!isNaN(val)) {
            calcState.memoryValue += val;
            calcState.resetNext = true;
            showToast("Added to Memory");
        }
    } else if (action === 'M-') {
        if (!isNaN(val)) {
            calcState.memoryValue -= val;
            calcState.resetNext = true;
            showToast("Subtracted from Memory");
        }
    }
}
function calcPercentage() {
    let val = parseFloat(calcState.currentValue);
    if (!isNaN(val)) {
        calcState.currentValue = (val / 100).toString();
        if (calcState.resetNext === false && calcState.operator === null) {
            // User is just typing, apply next press clean
            calcState.resetNext = true;
        }
        updateDisplay();
    }
}

function calculateInternal(a, b, op) {
    a = parseFloat(a);
    b = parseFloat(b);
    let result;
    switch (op) {
        case '+': result = a + b; break;
        case '-': result = a - b; break;
        case '*': result = a * b; break;
        case '/':
            if (b === 0) {
                showToast('Cannot divide by zero');
                return null;
            }
            result = a / b;
            break;
        default: result = b;
    }
    // Guard against Infinity and NaN
    if (!isFinite(result)) return 0;
    return result;
}

function calcOperation(op) {
    if (calcState.operator && !calcState.resetNext) {
        calcEquals(false);
    }
    calcState.previousValue = parseFloat(calcState.currentValue);
    calcState.operator = op;
    calcState.resetNext = true;
    updateDisplay();
}

function calcEquals(logHistory = true) {
    if (calcState.operator && calcState.previousValue !== null) {
        const currentNum = parseFloat(calcState.currentValue);
        const prevNum = calcState.previousValue;
        const result = calculateInternal(prevNum, currentNum, calcState.operator);

        // Division by zero returns null — abort without changing state
        if (result === null) return;

        if (logHistory) {
            addAuditEntry(prevNum, currentNum, calcState.operator, result);
        }

        calcState.currentValue = result.toString();
        calcState.previousValue = null;
        calcState.operator = null;
        calcState.resetNext = true;
        updateDisplay();
    }
}

function addAuditEntry(a, b, op, res) {
    // Track structured data for safe persistence
    auditEntries.unshift({ a: a, b: b, op: op, res: res });

    let opStr = op;
    if (opStr === '*') opStr = '×';
    if (opStr === '/') opStr = '÷';
    if (opStr === '-') opStr = '−';

    const equation = proFormatter.format(a) + ' ' + opStr + ' ' + proFormatter.format(b);
    const resultFormat = proFormatter.format(res);

    // Build DOM safely — no innerHTML, no inline onclick
    const li = document.createElement('li');
    li.className = 'audit-item';

    const eqDiv = document.createElement('div');
    eqDiv.className = 'audit-equation';
    eqDiv.textContent = equation + ' =';

    const resultRow = document.createElement('div');
    resultRow.className = 'audit-result-row';

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'audit-actions';

    // "Use" button — addEventListener instead of inline onclick
    const useBtn = document.createElement('button');
    useBtn.className = 'btn-use';
    useBtn.textContent = 'Use';
    useBtn.addEventListener('click', function () {
        useAuditValue(res);
    });

    // "Copy" button — addEventListener instead of inline onclick
    const copyBtn = document.createElement('button');
    copyBtn.className = 'icon-btn';
    copyBtn.title = 'Copy';
    copyBtn.setAttribute('aria-label', 'Copy result');
    const copySvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    copySvg.setAttribute('width', '14');
    copySvg.setAttribute('height', '14');
    copySvg.setAttribute('viewBox', '0 0 24 24');
    copySvg.setAttribute('fill', 'none');
    copySvg.setAttribute('stroke', 'currentColor');
    copySvg.setAttribute('stroke-width', '2');
    copySvg.setAttribute('stroke-linecap', 'round');
    copySvg.setAttribute('stroke-linejoin', 'round');
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', '9'); rect.setAttribute('y', '9');
    rect.setAttribute('width', '13'); rect.setAttribute('height', '13');
    rect.setAttribute('rx', '2'); rect.setAttribute('ry', '2');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1');
    copySvg.appendChild(rect);
    copySvg.appendChild(path);
    copyBtn.appendChild(copySvg);
    copyBtn.addEventListener('click', function () {
        const rawValue = resultFormat.replace(/[%,]/g, '');
        if (rawValue) {
            navigator.clipboard.writeText(rawValue).then(function () {
                showToast('Copied to clipboard!');
            }).catch(function () {
                showToast('Copy failed');
            });
        }
    });

    actionsDiv.appendChild(useBtn);
    actionsDiv.appendChild(copyBtn);

    const resDiv = document.createElement('div');
    resDiv.className = 'audit-result';
    resDiv.textContent = resultFormat;

    resultRow.appendChild(actionsDiv);
    resultRow.appendChild(resDiv);

    li.appendChild(eqDiv);
    li.appendChild(resultRow);

    auditList.prepend(li);
}

function clearAuditTape() {
    auditList.textContent = '';
    auditEntries = [];
}

function useAuditValue(val) {
    calcState.currentValue = val.toString();
    calcState.resetNext = true;
    updateDisplay();
    toggleHistory(); // Auto-close drawer on selection
    if (window.innerWidth <= 1024) {
        // Flash or somewhat indicate its loaded
        displayEl.style.color = 'var(--primary-blue)';
        setTimeout(() => { displayEl.style.color = ''; }, 300);
    }
}

/* --- Utility functions --- */

function copyResult(elementId, hardcodedValue, isMathRow) {
    let textToCopy;
    if (isMathRow) {
        // Scientific mode: strip the "= " prefix
        const el = document.getElementById(elementId);
        if (el) {
            textToCopy = el.textContent.replace('=', '').trim().replace(/[%,]/g, '');
        }
    } else if (hardcodedValue) {
        textToCopy = hardcodedValue.replace(/[%,]/g, '');
    } else {
        const el = document.getElementById(elementId);
        if (el) textToCopy = el.textContent.replace(/[%,]/g, '');
    }

    if (textToCopy) {
        navigator.clipboard.writeText(textToCopy).then(function () {
            showToast('Copied to clipboard!');
        }).catch(function () {
            showToast('Copy failed');
        });
    }
}

function showToast(msg = "Copied to clipboard!") {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2000);
}

function toggleDrawer() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('open');
}

function toggleHistory() {
    document.getElementById('history-drawer').classList.toggle('open');
}

/* --- Theme Toggle --- */
function toggleTheme() {
    const body = document.body;
    body.classList.toggle('dark-theme');

    // Sync checkbox state in case loadState flipped the body class
    const checkbox = document.getElementById('checkbox');
    if (checkbox) {
        checkbox.checked = body.classList.contains('dark-theme');
    }
}

/* --- Custom Color Picker --- */
function togglePaletteDropdown(event) {
    // Prevent body click from instantly closing right as we open it
    if (event) event.stopPropagation();
    document.getElementById('theme-dropdown-container').classList.toggle('active');
}

/* === Centralized Event Bindings === */
// Replaces all inline onclick/onchange handlers for CSP compliance
(function bindEvents() {
    // --- Calculator Keypad (event delegation) ---
    document.getElementById('calc-keypad').addEventListener('click', function (e) {
        var btn = e.target.closest('[data-action]');
        if (!btn) return;
        var action = btn.getAttribute('data-action');
        var value = btn.getAttribute('data-value');
        switch (action) {
            case 'digit': calcDigit(value); break;
            case 'op': calcOperation(value); break;
            case 'memory': calcMemory(value); break;
            case 'clear': calcAction('clear'); break;
            case 'backspace': calcAction('backspace'); break;
            case 'percent': calcPercentage(); break;
            case 'equals': calcEquals(); break;
        }
    });

    // --- Theme Swatches (event delegation) ---
    document.querySelector('.theme-picker').addEventListener('click', function (e) {
        var swatch = e.target.closest('.theme-swatch');
        if (!swatch) return;
        setThemeColor(swatch, swatch.getAttribute('data-theme'));
    });

    // --- Palette toggle ---
    document.getElementById('palette-toggle-btn').addEventListener('click', function (e) {
        togglePaletteDropdown(e);
    });

    // --- Dark mode toggle ---
    document.getElementById('checkbox').addEventListener('change', toggleTheme);

    // --- Add Row buttons (event delegation) ---
    document.querySelectorAll('[data-add-row]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            addRow(btn, btn.getAttribute('data-add-row'));
        });
    });

    // --- Mode toggle buttons ---
    document.querySelectorAll('[data-mode]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            setCalcMode(btn.getAttribute('data-mode'));
        });
    });

    // --- History toggle ---
    document.getElementById('history-toggle-btn').addEventListener('click', toggleHistory);
    document.getElementById('history-back-btn').addEventListener('click', toggleHistory);

    // --- Clear audit tape ---
    document.getElementById('clear-tape-btn').addEventListener('click', clearAuditTape);

    // --- Drawer close ---
    document.getElementById('close-drawer-btn').addEventListener('click', toggleDrawer);

    // --- Mobile toggle ---
    document.getElementById('mobile-toggle-btn').addEventListener('click', toggleDrawer);

    // --- Add scientific row ---
    document.getElementById('add-math-btn').addEventListener('click', addScientificRow);
})();

// Close dropdown when clicking outside
document.addEventListener('click', (event) => {
    const dropdown = document.getElementById('theme-dropdown-container');
    if (dropdown && dropdown.classList.contains('active') && !dropdown.contains(event.target)) {
        dropdown.classList.remove('active');
    }
});

function setThemeColor(btnEl, themeClass) {
    // Update active state on buttons
    document.querySelectorAll('.theme-swatch').forEach(btn => btn.classList.remove('active'));
    btnEl.classList.add('active');

    // Remove all existing theme classes from body
    document.body.classList.remove('theme-teal', 'theme-terracotta', 'theme-forest', 'theme-slate', 'theme-rosewood', 'theme-pistachio', 'theme-purple', 'theme-aurora', 'theme-aurora-ocean', 'theme-aurora-cyber', 'theme-aurora-sunset');

    // Add new theme class if one was passed (empty string = default Financial Blue)
    if (themeClass) {
        document.body.classList.add(themeClass);
    }

    // Auto close dropdown after picking
    togglePaletteDropdown(null);
}

/* --- Keyboard Shortcuts --- */
document.addEventListener('keydown', (e) => {
    // Ignore if user is typing in percentage inputs or mathlive fields
    if (e.target.tagName.toLowerCase() === 'input' || e.target.tagName.toLowerCase() === 'math-field') return;

    if (document.getElementById('sidebar').classList.contains('scientific-active')) return; // Ignore standard shortcuts in sci mode

    if (e.key >= '0' && e.key <= '9') {
        calcDigit(e.key);
    } else if (e.key === '.') {
        calcDigit('.');
    } else if (e.key === 'Backspace') {
        calcAction('backspace');
    } else if (e.key === 'Escape') {
        calcAction('clear');
    } else if (e.key === '%') {
        calcPercentage();
    } else if (['+', '-', '*', '/'].includes(e.key)) {
        calcOperation(e.key);
    } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault(); // Prevent form submission if any
        calcEquals();
    }
});

/* --- Scientific Calculator Mode (MathLive + Math.js) --- */

function setCalcMode(mode) {
    const sidebar = document.getElementById('sidebar');
    const btnStd = document.getElementById('btn-mode-std');
    const btnSci = document.getElementById('btn-mode-sci');
    const sciContainer = document.getElementById('sci-container');

    if (mode === 'scientific') {
        // Check if offline before allowing toggle
        if (!navigator.onLine || typeof math === 'undefined') {
            showToast("Scientific Mode requires an internet connection.");
            return;
        }

        document.body.classList.add('scientific-mode');
        sidebar.classList.add('scientific-active');
        btnStd.classList.remove('active');
        btnSci.classList.add('active');
        sciContainer.classList.add('active');

        // Initialize first row if empty
        if (document.getElementById('sci-rows-wrapper').children.length === 0) {
            addScientificRow();
        }
    } else {
        document.body.classList.remove('scientific-mode');
        sidebar.classList.remove('scientific-active');
        btnSci.classList.remove('active');
        btnStd.classList.add('active');
        sciContainer.classList.remove('active');
    }
}

function addScientificRow() {
    const wrapper = document.getElementById('sci-rows-wrapper');
    const row = document.createElement('div');
    row.className = 'math-row';

    const uniqueId = 'math-res-' + Math.random().toString(36).substring(2, 9);

    // Build math-field element
    const mf = document.createElement('math-field');
    mf.setAttribute('virtual-keyboard-mode', 'manual');

    // Build actions container
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'math-actions';

    const resEl = document.createElement('span');
    resEl.className = 'math-result';
    resEl.id = uniqueId;
    resEl.setAttribute('aria-live', 'polite');
    resEl.textContent = '= ';

    // Copy button — addEventListener instead of inline onclick
    const copyBtn = document.createElement('button');
    copyBtn.className = 'icon-btn';
    copyBtn.title = 'Copy Result';
    copyBtn.setAttribute('aria-label', 'Copy result');
    const copySvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    copySvg.setAttribute('width', '16'); copySvg.setAttribute('height', '16');
    copySvg.setAttribute('viewBox', '0 0 24 24'); copySvg.setAttribute('fill', 'none');
    copySvg.setAttribute('stroke', 'currentColor'); copySvg.setAttribute('stroke-width', '2');
    copySvg.setAttribute('stroke-linecap', 'round'); copySvg.setAttribute('stroke-linejoin', 'round');
    var r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    r.setAttribute('x', '9'); r.setAttribute('y', '9');
    r.setAttribute('width', '13'); r.setAttribute('height', '13');
    r.setAttribute('rx', '2'); r.setAttribute('ry', '2');
    var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1');
    copySvg.appendChild(r); copySvg.appendChild(p);
    copyBtn.appendChild(copySvg);
    copyBtn.addEventListener('click', function () {
        copyResult(uniqueId, null, true);
    });

    // Delete button — addEventListener instead of inline onclick
    const delBtn = document.createElement('button');
    delBtn.className = 'icon-btn delete-row-btn';
    delBtn.title = 'Delete';
    delBtn.setAttribute('aria-label', 'Delete row');
    const delSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    delSvg.setAttribute('width', '16'); delSvg.setAttribute('height', '16');
    delSvg.setAttribute('viewBox', '0 0 24 24'); delSvg.setAttribute('fill', 'none');
    delSvg.setAttribute('stroke', 'currentColor'); delSvg.setAttribute('stroke-width', '2');
    delSvg.setAttribute('stroke-linecap', 'round'); delSvg.setAttribute('stroke-linejoin', 'round');
    var l1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    l1.setAttribute('x1', '18'); l1.setAttribute('y1', '6'); l1.setAttribute('x2', '6'); l1.setAttribute('y2', '18');
    var l2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    l2.setAttribute('x1', '6'); l2.setAttribute('y1', '6'); l2.setAttribute('x2', '18'); l2.setAttribute('y2', '18');
    delSvg.appendChild(l1); delSvg.appendChild(l2);
    delBtn.appendChild(delSvg);
    delBtn.addEventListener('click', function () {
        row.remove();
    });

    actionsDiv.appendChild(resEl);
    actionsDiv.appendChild(copyBtn);
    actionsDiv.appendChild(delBtn);

    row.appendChild(mf);
    row.appendChild(actionsDiv);

    wrapper.appendChild(row);

    mf.addEventListener('focus', () => {
        document.querySelectorAll('math-field').forEach(f => f.classList.remove('last-focused'));
        mf.classList.add('last-focused');
    });

    mf.addEventListener('input', (ev) => {
        try {
            // Extract standard math expression string from MathLive
            const expr = mf.getValue('ascii-math');
            if (!expr || expr.trim() === '') {
                resEl.textContent = '= ';
                return;
            }

            // Use Math.js to evaluate safely
            const calculated = math.evaluate(expr);

            if (typeof calculated === 'number' && !isNaN(calculated)) {
                resEl.textContent = '= ' + proFormatter.format(calculated);
            } else if (calculated && calculated.value !== undefined) {
                resEl.textContent = '= ' + proFormatter.format(calculated.value);
            } else {
                resEl.textContent = '= ';
            }
        } catch (e) {
            // Invalid/incomplete math format typed
            resEl.textContent = '= ';
        }
    });

    // Focus new row automatically
    mf.focus();
}

/* copyResult is now a unified function — no monkey-patching needed */

// Ensure MathLive virtual keyboard doesn't steal focus from the input field
window.addEventListener('DOMContentLoaded', () => {
    // Some MathLive versions load asynchronously
    setTimeout(() => {
        if (window.mathVirtualKeyboard) {
            window.mathVirtualKeyboard.addEventListener('virtual-keyboard-toggle', () => {
                if (window.mathVirtualKeyboard.visible) {
                    const target = document.querySelector('math-field.last-focused') || document.querySelector('math-field');
                    if (target) {
                        // Small delay to let MathLive finish rendering its toggle
                        setTimeout(() => target.focus(), 50);
                    }
                }
            });
        }
    }, 500);
});

/* --- Chameleon Eye Tracking --- */
document.addEventListener('mousemove', (e) => {
    const mouseX = e.clientX;
    const mouseY = e.clientY;

    const pupil1 = document.getElementById('pupil1');
    const pupil2 = document.getElementById('pupil2');

    const movePupil = (pupil, maxRadius) => {
        if (!pupil) return;
        // Calculate position relative to the pupil's initial center
        const rect = pupil.parentElement.getBoundingClientRect();
        const eyeCenterX = rect.left + rect.width / 2;
        const eyeCenterY = rect.top + rect.height / 2;

        const dx = mouseX - eyeCenterX;
        const dy = mouseY - eyeCenterY;
        const angle = Math.atan2(dy, dx);

        // Let the eyes move faster if mouse is close, capped at maxRadius
        const dist = Math.min(maxRadius, Math.hypot(dx, dy) * 0.04);

        const tx = Math.cos(angle) * dist;
        const ty = Math.sin(angle) * dist;

        pupil.style.transform = `translate(${tx}px, ${ty}px)`;
    };

    // Calculate max travel radii for the two different sized eyes
    requestAnimationFrame(() => {
        movePupil(pupil1, 6);
        movePupil(pupil2, 5);
    });
});

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then((reg) => console.log('SW registered:', reg.scope))
            .catch((err) => console.warn('SW registration failed:', err));
    });
}
