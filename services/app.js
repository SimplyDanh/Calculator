'use strict';

/**
 * Percentage & Math Calculator - Services Layer
 * 
 * This file contains the core business logic, state management, and event bindings.
 * Wrapped in an IIFE to prevent global scope pollution (APP-L3).
 */
(function () {
    /* --- Configuration Constants (APP-L5) --- */
    const TOAST_DURATION_MS = 2000;
    const MAX_AUDIT_ENTRIES = 100;
    const SAVE_DEBOUNCE_MS = 500;
    const INPUT_LENGTH_LIMIT = 15;
    const SCI_RESTORE_DELAY_BASE_MS = 100;
    const EYE_RADIUS_PUPIL_1 = 6;
    const EYE_RADIUS_PUPIL_2 = 5;
    const EYE_FOLLOW_SPEED = 0.04;
    const MATH_EXPR_LIMIT = 1000; // DoS prevention (APP-L8)

    /* --- Security Allowlists --- */
    const VALID_THEMES = [
        'theme-teal', 'theme-terracotta', 'theme-forest', 'theme-slate',
        'theme-rosewood', 'theme-pistachio', 'theme-purple',
        'theme-aurora', 'theme-aurora-ocean', 'theme-aurora-cyber', 'theme-aurora-sunset',
        '' // Default theme
    ];

    const VALID_CARD_TYPES = ['type1', 'type2', 'type3', 'type4'];

    /* Formatter for professional decimal format */
    const proFormatter = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 4
    });

    /* --- Helper Functions --- */

    /**
     * Converts internal operators to display symbols (APP-L4)
     */
    function formatOperator(op) {
        switch (op) {
            case '*': return '×';
            case '/': return '÷';
            case '-': return '−';
            default: return op;
        }
    }

    /* --- Dynamic Left Panel Logic --- */

    const ROW_TEMPLATES = {
        'type1': `
                <div class="input-group">
                    <input type="number" name="val-x" class="val-x" placeholder="X" step="any" autocomplete="off">
                    <span>is what % of</span>
                    <input type="number" name="val-y" class="val-y" placeholder="Y" step="any" autocomplete="off">
                </div>
            `,
        'type2': `
                <div class="input-group">
                    <span>What is</span>
                    <input type="number" name="val-x" class="val-x" placeholder="X %" step="any" autocomplete="off">
                    <span>% of</span>
                    <input type="number" name="val-y" class="val-y" placeholder="Y" step="any" autocomplete="off">
                </div>
            `,
        'type3': `
                <div class="input-group">
                    <span>Change from</span>
                    <input type="number" name="val-x" class="val-x" placeholder="X" step="any" autocomplete="off">
                    <span>to</span>
                    <input type="number" name="val-y" class="val-y" placeholder="Y" step="any" autocomplete="off">
                </div>
            `,
        'type4': `
                <div class="input-group">
                    <input type="number" name="val-x" class="val-x" placeholder="X" step="any" autocomplete="off">
                    <span>is</span>
                    <input type="number" name="val-y" class="val-y" placeholder="P %" step="any" autocomplete="off">
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
                else resText = 'Error';
                break;
            case 'type2':
                resText = proFormatter.format((x / 100) * y);
                break;
            case 'type3':
                if (x !== 0) {
                    const res = ((y - x) / Math.abs(x)) * 100;
                    const sign = res > 0 ? '+' : '';
                    resText = sign + proFormatter.format(res) + '%';
                } else resText = 'Error';
                break;
            case 'type4':
                if (y !== 0) resText = proFormatter.format(x / (y / 100));
                else resText = 'Error';
                break;
        }
        return resText;
    }

    function createRow(type) {
        const container = document.createElement('div');
        container.className = 'calc-row-instance';

        const uniqueId = 'res-' + crypto.randomUUID().slice(0, 8);

        // Build Row Template part
        const templateContainer = document.createElement('div');
        templateContainer.className = 'row-template-content';

        // Safety: ROW_TEMPLATES contain static spans and inputs, no user data
        templateContainer.innerHTML = ROW_TEMPLATES[type];
        container.appendChild(templateContainer);

        // Build Result Group part programmatically
        const resultGroup = document.createElement('div');
        resultGroup.className = 'result-group';

        const resultLabel = document.createElement('span');
        resultLabel.textContent = 'Result:';
        resultGroup.appendChild(resultLabel);

        const resultValue = document.createElement('span');
        resultValue.className = 'result-value';
        resultValue.id = uniqueId;
        resultValue.textContent = (type === 'type1' || type === 'type3') ? '0.00%' : '0.00';
        resultGroup.appendChild(resultValue);

        const copyBtn = document.createElement('button');
        copyBtn.className = 'icon-btn copy-row-btn';
        copyBtn.title = 'Copy to clipboard';
        copyBtn.setAttribute('aria-label', 'Copy result');
        copyBtn.appendChild(createCopySvg(18));
        resultGroup.appendChild(copyBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'icon-btn delete-row-btn';
        deleteBtn.title = 'Delete Row';
        deleteBtn.setAttribute('aria-label', 'Delete row');

        const deleteSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        deleteSvg.setAttribute('width', '18');
        deleteSvg.setAttribute('height', '18');
        deleteSvg.setAttribute('viewBox', '0 0 24 24');
        deleteSvg.setAttribute('fill', 'none');
        deleteSvg.setAttribute('stroke', 'currentColor');
        deleteSvg.setAttribute('stroke-width', '2');
        deleteSvg.setAttribute('stroke-linecap', 'round');
        deleteSvg.setAttribute('stroke-linejoin', 'round');

        const l1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        l1.setAttribute('x1', '18'); l1.setAttribute('y1', '6'); l1.setAttribute('x2', '6'); l1.setAttribute('y2', '18');
        const l2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        l2.setAttribute('x1', '6'); l2.setAttribute('y1', '6'); l2.setAttribute('x2', '18'); l2.setAttribute('y2', '18');
        deleteSvg.appendChild(l1);
        deleteSvg.appendChild(l2);
        deleteBtn.appendChild(deleteSvg);
        resultGroup.appendChild(deleteBtn);

        container.appendChild(resultGroup);

        // Bind copy and delete
        copyBtn.addEventListener('click', () => copyResult(uniqueId));
        deleteBtn.addEventListener('click', () => deleteRow(deleteBtn));

        // Setup listeners
        const xInput = container.querySelector('.val-x');
        const yInput = container.querySelector('.val-y');
        const resEl = resultValue;

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
    }

    function deleteRow(btnEl) {
        const rowInstance = btnEl.closest('.calc-row-instance');
        if (rowInstance) rowInstance.remove();
    }

    /* --- State Persistence (localStorage) --- */
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
            if (!type) return;

            state.cards[type] = Array.from(card.querySelectorAll('.calc-row-instance')).map(row => {
                const xInp = row.querySelector('.val-x');
                const yInp = row.querySelector('.val-y');
                return {
                    x: xInp ? xInp.value : '',
                    y: yInp ? yInp.value : ''
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
            restoreThemeAndMode(state);
            restoreAuditTape(state);
            restorePercentageCards(state);
            restoreScientificRows(state);
            return true;
        } catch (e) {
            console.error("Failed to load calc state", e);
            return false;
        }
    }

    function restoreThemeAndMode(state) {
        if (state.darkMode && !document.body.classList.contains('dark-theme')) toggleTheme();
        if (!state.darkMode && document.body.classList.contains('dark-theme')) toggleTheme();

        const checkbox = document.getElementById('checkbox');
        if (checkbox) checkbox.checked = state.darkMode;

        if (state.theme && VALID_THEMES.includes(state.theme)) {
            const btn = document.querySelector('.theme-swatch[data-theme="' + state.theme + '"]');
            if (btn) setThemeColor(btn, state.theme);
        }

        if (state.mode === 'scientific') {
            const isMobileDrawer = window.matchMedia('(max-width: 1024px)').matches;
            if (!isMobileDrawer) {
                setCalcMode('scientific');
            }
            // On mobile, skip restoring SCI mode — the drawer is closed,
            // so the left panel would be invisible with no way to recover.
        }
    }

    function restoreAuditTape(state) {
        if (state.auditData && Array.isArray(state.auditData)) {
            state.auditData.slice().reverse().forEach(entry => {
                if (typeof entry.a === 'number' && typeof entry.b === 'number' &&
                    typeof entry.op === 'string' && typeof entry.res === 'number' &&
                    isFinite(entry.a) && isFinite(entry.b) && isFinite(entry.res)) {
                    addAuditEntry(entry.a, entry.b, entry.op, entry.res);
                }
            });
        }
    }

    function restorePercentageCards(state) {
        Object.keys(state.cards || {}).forEach(type => {
            if (!VALID_CARD_TYPES.includes(type)) return;

            const card = document.querySelector(`.calc-card[data-type="${type}"]`);
            if (card) {
                const container = card.querySelector('.calc-rows-container');
                if (!container) return;

                container.replaceChildren();
                if (state.cards[type].length === 0) {
                    container.appendChild(createRow(type));
                } else {
                    state.cards[type].forEach(rowData => {
                        const newRow = createRow(type);
                        const x = newRow.querySelector('.val-x');
                        const y = newRow.querySelector('.val-y');
                        if (x && y) {
                            x.value = rowData.x || '';
                            y.value = rowData.y || '';
                            container.appendChild(newRow);
                            x.dispatchEvent(new Event('input'));
                        }
                    });
                }
            }
        });
    }

    function restoreScientificRows(state) {
        if (state.sciRows && state.sciRows.length > 0) {
            const sciWrapper = document.querySelector('.sci-rows-wrapper');
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
                    }, SCI_RESTORE_DELAY_BASE_MS * (index + 1));
                });
            }
        }
    }

    (function initSaveTriggers() {
        let saveTimeout;
        function triggerSave() {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(saveState, SAVE_DEBOUNCE_MS);
        }

        const inputs = document.querySelectorAll('.calc-card, .scientific-container');
        inputs.forEach(container => {
            container.addEventListener('input', triggerSave);
        });

        document.addEventListener('click', (e) => {
            if (e.target.closest('button')) triggerSave();
        });
    })();

    window.addEventListener('DOMContentLoaded', () => {
        const loaded = loadState();
        if (!loaded) {
            document.querySelectorAll('.calc-card').forEach(card => {
                const type = card.getAttribute('data-type');
                const container = card.querySelector('.calc-rows-container');
                if (container) container.appendChild(createRow(type));
            });
        }

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

        document.querySelectorAll('button[title]:not([aria-label])').forEach(btn => {
            btn.setAttribute('aria-label', btn.getAttribute('title'));
        });

        setTimeout(() => {
            if (window.mathVirtualKeyboard) {
                window.mathVirtualKeyboard.addEventListener('virtual-keyboard-toggle', () => {
                    if (window.mathVirtualKeyboard.visible) {
                        const target = document.querySelector('math-field.last-focused') || document.querySelector('math-field');
                        if (target) {
                            setTimeout(() => target.focus(), 50);
                        }
                    }
                });
            }
        }, 500);
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
    const memoryIndicatorEl = document.getElementById('memory-indicator');

    function updateMemoryIndicator() {
        if (!memoryIndicatorEl) return;
        if (calcState.memoryValue !== 0) {
            memoryIndicatorEl.hidden = false;
        } else {
            memoryIndicatorEl.hidden = true;
        }
    }

    const DISPLAY_MAX_FONT = 2.5;   // rem
    const DISPLAY_MIN_FONT = 1.0;   // rem
    const DISPLAY_FONT_STEP = 0.2;  // rem

    /** Format a number in scientific notation: 9.99999998E+17 */
    function toSciNotation(val) {
        const exp = Math.floor(Math.log10(Math.abs(val)));
        const coeff = val / Math.pow(10, exp);
        const coeffStr = parseFloat(coeff.toPrecision(10)).toString();
        return `${coeffStr}E+${exp}`;
    }

    /**
     * Shrink the display font until the text fits within the container,
     * starting at the max font size. If it still overflows at the
     * minimum font, fall back to scientific notation.
     */
    function fitDisplayText(text, targetVal) {
        displayEl.textContent = text;
        displayEl.style.fontSize = DISPLAY_MAX_FONT + 'rem';

        const container = displayEl.parentElement;
        const containerWidth = container.clientWidth - 48; // account for padding

        let currentFont = DISPLAY_MAX_FONT;
        while (displayEl.scrollWidth > containerWidth && currentFont > DISPLAY_MIN_FONT) {
            currentFont = Math.max(currentFont - DISPLAY_FONT_STEP, DISPLAY_MIN_FONT);
            displayEl.style.fontSize = currentFont + 'rem';
        }

        // If still overflowing at minimum font, use scientific notation
        if (displayEl.scrollWidth > containerWidth && Math.abs(targetVal) >= 1e6) {
            const sci = toSciNotation(targetVal);
            displayEl.textContent = sci;
            displayEl.style.fontSize = DISPLAY_MIN_FONT + 'rem';

            // Try scaling sci notation text back up
            currentFont = DISPLAY_MIN_FONT;
            while (currentFont < DISPLAY_MAX_FONT) {
                const next = Math.min(currentFont + DISPLAY_FONT_STEP, DISPLAY_MAX_FONT);
                displayEl.style.fontSize = next + 'rem';
                if (displayEl.scrollWidth > containerWidth) {
                    displayEl.style.fontSize = currentFont + 'rem';
                    break;
                }
                currentFont = next;
            }
        }
    }

    function updateDisplay() {
        if (!displayEl || !previewEl) return;

        let hasDot = calcState.currentValue.endsWith('.');
        let targetVal = parseFloat(calcState.currentValue);
        if (isNaN(targetVal)) targetVal = 0;

        let formatted = proFormatter.format(targetVal);
        if (hasDot) formatted += '.';

        fitDisplayText(formatted, targetVal);

        if (calcState.previousValue !== null && calcState.operator) {
            const opStr = formatOperator(calcState.operator);
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
            if (calcState.currentValue.replace(/[^0-9]/g, '').length >= INPUT_LENGTH_LIMIT) return;

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
            if (previewEl) previewEl.textContent = '';
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
        updateMemoryIndicator();
    }
    function calcPercentage() {
        let val = parseFloat(calcState.currentValue);
        if (!isNaN(val)) {
            calcState.currentValue = (val / 100).toString();
            if (calcState.resetNext === false && calcState.operator === null) {
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
        auditEntries.unshift({ a: a, b: b, op: op, res: res });
        if (auditEntries.length > MAX_AUDIT_ENTRIES) auditEntries.length = MAX_AUDIT_ENTRIES;

        const opStr = formatOperator(op);
        const equation = proFormatter.format(a) + ' ' + opStr + ' ' + proFormatter.format(b);
        const resultFormat = proFormatter.format(res);

        const li = document.createElement('li');
        li.className = 'audit-item';

        const eqDiv = document.createElement('div');
        eqDiv.className = 'audit-equation';
        eqDiv.textContent = equation + ' =';

        const resultRow = document.createElement('div');
        resultRow.className = 'audit-result-row';

        const actionsDiv = createAuditActions(res, resultFormat);
        const resDiv = document.createElement('div');
        resDiv.className = 'audit-result';
        resDiv.textContent = resultFormat;

        resultRow.appendChild(actionsDiv);
        resultRow.appendChild(resDiv);
        li.appendChild(eqDiv);
        li.appendChild(resultRow);
        if (auditList) auditList.prepend(li);
    }

    function createAuditActions(res, resultFormat) {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'audit-actions';

        const useBtn = document.createElement('button');
        useBtn.className = 'btn-use';
        useBtn.textContent = 'Use';
        useBtn.addEventListener('click', () => useAuditValue(res));

        const copyBtn = document.createElement('button');
        copyBtn.className = 'icon-btn';
        copyBtn.title = 'Copy';
        copyBtn.setAttribute('aria-label', 'Copy result');
        copyBtn.appendChild(createCopySvg(14));

        copyBtn.addEventListener('click', () => {
            const rawValue = resultFormat.replace(/[%,]/g, '');
            if (rawValue) {
                navigator.clipboard.writeText(rawValue).then(() => {
                    showToast('Copied to clipboard!');
                }).catch(() => {
                    showToast('Copy failed');
                });
            }
        });

        actionsDiv.appendChild(useBtn);
        actionsDiv.appendChild(copyBtn);
        return actionsDiv;
    }

    function clearAuditTape() {
        if (auditList) auditList.textContent = '';
        auditEntries = [];
    }

    function useAuditValue(val) {
        calcState.currentValue = val.toString();
        calcState.resetNext = true;
        updateDisplay();
        toggleHistory();
        if (window.innerWidth <= 1024 && displayEl) {
            displayEl.style.color = 'var(--primary-blue)';
            setTimeout(() => { displayEl.style.color = ''; }, 300);
        }
    }

    /* --- Utility functions --- */

    function copyResult(elementId, hardcodedValue, isMathRow) {
        let textToCopy;
        if (isMathRow) {
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

    let toastTimeout;
    function showToast(msg = "Copied to clipboard!") {
        const toast = document.getElementById('toast');
        if (!toast) return;

        clearTimeout(toastTimeout);
        toast.textContent = msg;
        toast.classList.add('show');
        toastTimeout = setTimeout(() => {
            toast.classList.remove('show');
        }, TOAST_DURATION_MS);
    }

    function createCopySvg(size = 14) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', size);
        svg.setAttribute('height', size);
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '2');
        svg.setAttribute('stroke-linecap', 'round');
        svg.setAttribute('stroke-linejoin', 'round');

        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', '9'); rect.setAttribute('y', '9');
        rect.setAttribute('width', '13'); rect.setAttribute('height', '13');
        rect.setAttribute('rx', '2'); rect.setAttribute('ry', '2');

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1');

        svg.appendChild(rect);
        svg.appendChild(path);
        return svg;
    }

    function toggleDrawer() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.classList.toggle('open');
    }

    function toggleHistory() {
        const historyDrawer = document.getElementById('history-drawer');
        if (historyDrawer) historyDrawer.classList.toggle('open');
    }

    /* --- Theme Toggle --- */
    function toggleTheme() {
        const body = document.body;

        const isAurora = Array.from(body.classList).some(c => c.startsWith('theme-aurora'));
        if (isAurora && body.classList.contains('dark-theme')) {
            body.classList.remove('theme-aurora', 'theme-aurora-ocean', 'theme-aurora-cyber', 'theme-aurora-sunset');

            document.querySelectorAll('.theme-swatch').forEach(btn => btn.classList.remove('active'));
            const defaultSwatch = document.querySelector('.theme-swatch[data-theme=""]');
            if (defaultSwatch) defaultSwatch.classList.add('active');
        }

        body.classList.toggle('dark-theme');

        const checkbox = document.getElementById('checkbox');
        if (checkbox) {
            checkbox.checked = body.classList.contains('dark-theme');
        }
    }

    /* --- Custom Color Picker --- */
    function togglePaletteDropdown(event) {
        if (event) event.stopPropagation();
        const dropdown = document.getElementById('theme-dropdown-container');
        if (dropdown) dropdown.classList.toggle('active');
    }

    /* === Centralized Event Bindings === */
    (function bindEvents() {
        const keypad = document.getElementById('calc-keypad');
        if (keypad) {
            keypad.addEventListener('click', function (e) {
                const btn = e.target.closest('[data-action]');
                if (!btn) return;
                const action = btn.getAttribute('data-action');
                const value = btn.getAttribute('data-value');
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
        }

        const picker = document.querySelector('.theme-picker');
        if (picker) {
            picker.addEventListener('click', function (e) {
                const swatch = e.target.closest('.theme-swatch');
                if (!swatch) return;
                setThemeColor(swatch, swatch.getAttribute('data-theme'));
            });
        }

        const paletteBtn = document.getElementById('palette-toggle-btn');
        if (paletteBtn) {
            paletteBtn.addEventListener('click', function (e) {
                togglePaletteDropdown(e);
            });
        }

        const themeCheckbox = document.getElementById('checkbox');
        if (themeCheckbox) {
            themeCheckbox.addEventListener('change', toggleTheme);
        }

        document.querySelectorAll('[data-add-row]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                addRow(btn, btn.getAttribute('data-add-row'));
            });
        });

        document.querySelectorAll('[data-mode]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                setCalcMode(btn.getAttribute('data-mode'));
            });
        });

        const historyBtn = document.getElementById('history-toggle-btn');
        if (historyBtn) historyBtn.addEventListener('click', toggleHistory);
        const historyBackBtn = document.getElementById('history-back-btn');
        if (historyBackBtn) historyBackBtn.addEventListener('click', toggleHistory);

        const clearTapeBtn = document.getElementById('clear-tape-btn');
        if (clearTapeBtn) clearTapeBtn.addEventListener('click', clearAuditTape);

        const closeDrawerBtn = document.getElementById('close-drawer-btn');
        if (closeDrawerBtn) closeDrawerBtn.addEventListener('click', toggleDrawer);

        const mobileBtn = document.getElementById('mobile-panel-toggle-btn');
        if (mobileBtn) mobileBtn.addEventListener('click', toggleDrawer);

        const addMathBtn = document.getElementById('add-math-btn');
        if (addMathBtn) addMathBtn.addEventListener('click', addScientificRow);
    })();

    document.addEventListener('click', (event) => {
        const dropdown = document.getElementById('theme-dropdown-container');
        if (dropdown && dropdown.classList.contains('active') && !dropdown.contains(event.target)) {
            dropdown.classList.remove('active');
        }
    });

    function setThemeColor(btnEl, themeClass) {
        if (themeClass && !VALID_THEMES.includes(themeClass)) return;

        document.querySelectorAll('.theme-swatch').forEach(btn => {
            btn.classList.remove('active');
            btn.setAttribute('aria-checked', 'false');
        });
        btnEl.classList.add('active');
        btnEl.setAttribute('aria-checked', 'true');

        document.body.classList.remove('theme-teal', 'theme-terracotta', 'theme-forest', 'theme-slate', 'theme-rosewood', 'theme-pistachio', 'theme-purple', 'theme-aurora', 'theme-aurora-ocean', 'theme-aurora-cyber', 'theme-aurora-sunset');

        if (themeClass) {
            document.body.classList.add(themeClass);

            if (themeClass.startsWith('theme-aurora')) {
                document.body.classList.add('dark-theme');
                const checkbox = document.getElementById('checkbox');
                if (checkbox) checkbox.checked = true;
            }
        }

        const dropdown = document.getElementById('theme-dropdown-container');
        if (dropdown) dropdown.classList.remove('active');
    }

    /* --- Keyboard Shortcuts --- */
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName.toLowerCase() === 'input' || e.target.tagName.toLowerCase() === 'math-field') return;

        const sidebar = document.getElementById('sidebar');
        if (sidebar && sidebar.classList.contains('scientific-active')) return;

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
            e.preventDefault();
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
            if (!navigator.onLine || typeof math === 'undefined') {
                showToast("Scientific Mode requires an internet connection.");
                return;
            }

            document.body.classList.add('scientific-mode');
            if (sidebar) sidebar.classList.add('scientific-active');
            if (btnStd) {
                btnStd.classList.remove('active');
                btnStd.setAttribute('aria-checked', 'false');
            }
            if (btnSci) {
                btnSci.classList.add('active');
                btnSci.setAttribute('aria-checked', 'true');
            }
            if (sciContainer) sciContainer.classList.add('active');

            const sciRowsWrapper = document.getElementById('sci-rows-wrapper');
            if (sciRowsWrapper && sciRowsWrapper.children.length === 0) {
                addScientificRow();
            }
        } else {
            document.body.classList.remove('scientific-mode');
            if (sidebar) sidebar.classList.remove('scientific-active');
            if (btnSci) {
                btnSci.classList.remove('active');
                btnSci.setAttribute('aria-checked', 'false');
            }
            if (btnStd) {
                btnStd.classList.add('active');
                btnStd.setAttribute('aria-checked', 'true');
            }
            if (sciContainer) sciContainer.classList.remove('active');
        }
    }

    function addScientificRow() {
        const wrapper = document.querySelector('.sci-rows-wrapper');
        if (!wrapper) return;

        const row = document.createElement('div');
        row.className = 'math-row';

        const uniqueId = 'math-res-' + crypto.randomUUID().slice(0, 8);
        const mf = createMathField();
        const actionsDiv = createMathActions(uniqueId, row);

        row.appendChild(mf);
        row.appendChild(actionsDiv);
        wrapper.appendChild(row);

        const resEl = document.getElementById(uniqueId);
        if (resEl) setupMathFieldListeners(mf, resEl);
        mf.focus();
    }

    function createMathField() {
        const mf = document.createElement('math-field');
        mf.setAttribute('virtual-keyboard-mode', 'manual');
        mf.addEventListener('focus', () => {
            document.querySelectorAll('math-field').forEach(f => f.classList.remove('last-focused'));
            mf.classList.add('last-focused');
        });
        return mf;
    }

    function createMathActions(uniqueId, rowEl) {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'math-actions';

        const resEl = document.createElement('span');
        resEl.className = 'math-result';
        resEl.id = uniqueId;
        resEl.setAttribute('aria-live', 'polite');
        resEl.textContent = '= ';

        const copyBtn = document.createElement('button');
        copyBtn.className = 'icon-btn';
        copyBtn.title = 'Copy Result';
        copyBtn.setAttribute('aria-label', 'Copy result');
        copyBtn.appendChild(createCopySvg(16));
        copyBtn.addEventListener('click', () => copyResult(uniqueId, null, true));

        const delBtn = document.createElement('button');
        delBtn.className = 'icon-btn delete-row-btn';
        delBtn.title = 'Delete';
        delBtn.setAttribute('aria-label', 'Delete row');

        const delSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        delSvg.setAttribute('width', '16'); delSvg.setAttribute('height', '16');
        delSvg.setAttribute('viewBox', '0 0 24 24'); delSvg.setAttribute('fill', 'none');
        delSvg.setAttribute('stroke', 'currentColor'); delSvg.setAttribute('stroke-width', '2');
        delSvg.setAttribute('stroke-linecap', 'round'); delSvg.setAttribute('stroke-linejoin', 'round');
        const l1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        l1.setAttribute('x1', '18'); l1.setAttribute('y1', '6'); l1.setAttribute('x2', '6'); l1.setAttribute('y2', '18');
        const l2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        l2.setAttribute('x1', '6'); l2.setAttribute('y1', '6'); l2.setAttribute('x2', '18'); l2.setAttribute('y2', '18');
        delSvg.appendChild(l1); delSvg.appendChild(l2);
        delBtn.appendChild(delSvg);
        delBtn.addEventListener('click', () => rowEl.remove());

        actionsDiv.appendChild(resEl);
        actionsDiv.appendChild(copyBtn);
        actionsDiv.appendChild(delBtn);
        return actionsDiv;
    }

    function setupMathFieldListeners(mf, resEl) {
        mf.addEventListener('input', () => {
            try {
                const expr = mf.getValue('ascii-math');
                if (!expr || expr.trim() === '') {
                    resEl.textContent = '= ';
                    return;
                }

                // APP-L8 FIX: Limit expression complexity
                if (expr.length > MATH_EXPR_LIMIT) {
                    resEl.textContent = '= ERR: TOO LONG';
                    return;
                }

                const calculated = math.evaluate(expr);
                if (typeof calculated === 'number' && !isNaN(calculated)) {
                    resEl.textContent = '= ' + proFormatter.format(calculated);
                } else if (calculated && calculated.value !== undefined) {
                    resEl.textContent = '= ' + proFormatter.format(calculated.value);
                } else {
                    resEl.textContent = '= ';
                }
            } catch (e) {
                resEl.textContent = '= ';
            }
        });
    }

    /* --- Chameleon Eye Tracking --- */
    const pupil1 = document.getElementById('pupil1');
    const pupil2 = document.getElementById('pupil2');

    let rafPending = false; // APP-L9 FIX: Throttle flag
    document.addEventListener('mousemove', (e) => {
        if (rafPending) return;
        rafPending = true;

        requestAnimationFrame(() => {
            const mouseX = e.clientX;
            const mouseY = e.clientY;

            const movePupil = (pupil, maxRadius) => {
                if (!pupil) return;
                const rect = pupil.parentElement.getBoundingClientRect();
                const eyeCenterX = rect.left + rect.width / 2;
                const eyeCenterY = rect.top + rect.height / 2;

                const dx = mouseX - eyeCenterX;
                const dy = mouseY - eyeCenterY;
                const angle = Math.atan2(dy, dx);

                const dist = Math.min(maxRadius, Math.hypot(dx, dy) * EYE_FOLLOW_SPEED);

                const tx = Math.cos(angle) * dist;
                const ty = Math.sin(angle) * dist;

                pupil.style.transform = `translate(${tx}px, ${ty}px)`;
            };

            movePupil(pupil1, EYE_RADIUS_PUPIL_1);
            movePupil(pupil2, EYE_RADIUS_PUPIL_2);
            rafPending = false;
        });
    });

    /* --- PWA Service Worker auto-update --- */
    if (window.location.protocol !== 'file:') {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                // SW-L1 FIX: Explicit scope restriction
                navigator.serviceWorker.register('./sw.js', { scope: './' })
                    .then((reg) => {
                        reg.addEventListener('updatefound', () => {
                            const newWorker = reg.installing;
                            if (newWorker) {
                                newWorker.addEventListener('statechange', () => {
                                    if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
                                        saveState();
                                        window.location.reload();
                                    }
                                });
                            }
                        });
                    })
                    .catch((err) => console.warn('SW registration failed:', err));
            });
        }
    }
})();
