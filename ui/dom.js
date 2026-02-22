/* --- UI DOM Logic --- */

const displayEl = document.getElementById('main-calc-display');
const previewEl = document.getElementById('main-calc-prev');
const auditList = document.getElementById('audit-list');

function updateDisplay() {
    let hasDot = calcState.currentValue.endsWith('.');
    let targetVal = parseFloat(calcState.currentValue);
    if (isNaN(targetVal)) targetVal = 0;

    let formatted = proFormatter.format(targetVal);
    if (hasDot) formatted += '.';
    if (displayEl) displayEl.textContent = formatted;

    if (previewEl) {
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
}

function createRow(type) {
    const container = document.createElement('div');
    container.className = 'calc-row-instance';

    const uniqueId = 'res-' + Math.random().toString(36).substring(2, 9);

    const inputGroup = document.createElement('div');
    inputGroup.className = 'input-group';

    const xInput = document.createElement('input');
    xInput.type = 'number';
    xInput.className = 'val-x';
    xInput.step = 'any';

    const yInput = document.createElement('input');
    yInput.type = 'number';
    yInput.className = 'val-y';
    yInput.step = 'any';

    if (type === 'type1') {
        xInput.placeholder = 'X';
        const span1 = document.createElement('span'); span1.textContent = 'is what % of';
        yInput.placeholder = 'Y';
        inputGroup.append(xInput, span1, yInput);
    } else if (type === 'type2') {
        const span1 = document.createElement('span'); span1.textContent = 'What is';
        xInput.placeholder = 'X %';
        const span2 = document.createElement('span'); span2.textContent = '% of';
        yInput.placeholder = 'Y';
        inputGroup.append(span1, xInput, span2, yInput);
    } else if (type === 'type3') {
        const span1 = document.createElement('span'); span1.textContent = 'Change from';
        xInput.placeholder = 'X';
        const span2 = document.createElement('span'); span2.textContent = 'to';
        yInput.placeholder = 'Y';
        inputGroup.append(span1, xInput, span2, yInput);
    } else if (type === 'type4') {
        xInput.placeholder = 'X';
        const span1 = document.createElement('span'); span1.textContent = 'is';
        yInput.placeholder = 'P %';
        const span2 = document.createElement('span'); span2.textContent = '% of what?';
        inputGroup.append(xInput, span1, yInput, span2);
    }

    const resultGroup = document.createElement('div');
    resultGroup.className = 'result-group';

    const resLbl = document.createElement('span');
    resLbl.textContent = 'Result:';

    const resVal = document.createElement('span');
    resVal.className = 'result-value';
    resVal.id = uniqueId;
    resVal.textContent = (type === 'type1' || type === 'type3') ? '0.00%' : '0.00';

    const copyRowBtn = document.createElement('button');
    copyRowBtn.className = 'icon-btn copy-row-btn';
    copyRowBtn.title = 'Copy to clipboard';
    copyRowBtn.setAttribute('aria-label', 'Copy result');
    copyRowBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
    copyRowBtn.addEventListener('click', () => copyResult(uniqueId));

    const deleteRowBtn = document.createElement('button');
    deleteRowBtn.className = 'icon-btn delete-row-btn';
    deleteRowBtn.title = 'Delete Row';
    deleteRowBtn.setAttribute('aria-label', 'Delete row');
    deleteRowBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
    deleteRowBtn.addEventListener('click', function () { deleteRow(this); });

    resultGroup.append(resLbl, resVal, copyRowBtn, deleteRowBtn);
    container.append(inputGroup, resultGroup);

    const updater = () => {
        const xVal = parseFloat(xInput.value);
        const yVal = parseFloat(yInput.value);
        resVal.textContent = calculateRowResult(type,
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
    rowInstance.remove();
}

function addAuditEntry(a, b, op, res) {
    auditEntries.unshift({ a: a, b: b, op: op, res: res });

    let opStr = op;
    if (opStr === '*') opStr = '×';
    if (opStr === '/') opStr = '÷';
    if (opStr === '-') opStr = '−';

    const equation = proFormatter.format(a) + ' ' + opStr + ' ' + proFormatter.format(b);
    const resultFormat = proFormatter.format(res);

    const li = document.createElement('li');
    li.className = 'audit-item';

    const eqDiv = document.createElement('div');
    eqDiv.className = 'audit-equation';
    eqDiv.textContent = equation + ' =';

    const resultRow = document.createElement('div');
    resultRow.className = 'audit-result-row';

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'audit-actions';

    const useBtn = document.createElement('button');
    useBtn.className = 'btn-use';
    useBtn.textContent = 'Use';
    useBtn.addEventListener('click', function () {
        useAuditValue(res);
    });

    const copyBtn = document.createElement('button');
    copyBtn.className = 'icon-btn';
    copyBtn.title = 'Copy';
    copyBtn.setAttribute('aria-label', 'Copy result');
    copyBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
    copyBtn.addEventListener('click', function () {
        const rawValue = resultFormat.replace(/[%,]/g, '');
        if (rawValue) {
            navigator.clipboard.writeText(rawValue).then(() => showToast('Copied to clipboard!')).catch(() => showToast('Copy failed'));
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
    toggleHistory();
    if (window.innerWidth <= 1024) {
        displayEl.style.color = 'var(--primary-blue)';
        setTimeout(() => { displayEl.style.color = ''; }, 300);
    }
}

function copyResult(elementId, hardcodedValue, isMathRow) {
    let textToCopy;
    if (isMathRow) {
        const el = document.getElementById(elementId);
        if (el) textToCopy = el.textContent.replace('=', '').trim().replace(/[%,]/g, '');
    } else if (hardcodedValue) {
        textToCopy = hardcodedValue.replace(/[%,]/g, '');
    } else {
        const el = document.getElementById(elementId);
        if (el) textToCopy = el.textContent.replace(/[%,]/g, '');
    }

    if (textToCopy) {
        navigator.clipboard.writeText(textToCopy).then(() => showToast('Copied to clipboard!')).catch(() => showToast('Copy failed'));
    }
}

function showToast(msg = "Copied to clipboard!") {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => { toast.classList.remove('show'); }, 2000);
}

function toggleDrawer() {
    document.getElementById('sidebar').classList.toggle('open');
}

function toggleHistory() {
    document.getElementById('history-drawer').classList.toggle('open');
}

/* === Centralized Event Bindings === */
document.addEventListener('DOMContentLoaded', () => {
    const calcKeypad = document.getElementById('calc-keypad');
    if (calcKeypad) {
        calcKeypad.addEventListener('click', function (e) {
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
    }

    const themePicker = document.querySelector('.theme-picker');
    if (themePicker) {
        themePicker.addEventListener('click', function (e) {
            var swatch = e.target.closest('.theme-swatch');
            if (swatch) setThemeColor(swatch, swatch.getAttribute('data-theme'));
        });
    }

    const paletteToggleBtn = document.getElementById('palette-toggle-btn');
    if (paletteToggleBtn) paletteToggleBtn.addEventListener('click', togglePaletteDropdown);

    const checkbox = document.getElementById('checkbox');
    if (checkbox) checkbox.addEventListener('change', toggleTheme);

    document.querySelectorAll('[data-add-row]').forEach(btn => {
        btn.addEventListener('click', function () { addRow(btn, btn.getAttribute('data-add-row')); });
    });

    document.querySelectorAll('[data-mode]').forEach(btn => {
        btn.addEventListener('click', function () { setCalcMode(btn.getAttribute('data-mode')); });
    });

    const histToggle = document.getElementById('history-toggle-btn');
    if (histToggle) histToggle.addEventListener('click', toggleHistory);

    const histBack = document.getElementById('history-back-btn');
    if (histBack) histBack.addEventListener('click', toggleHistory);

    const clearTape = document.getElementById('clear-tape-btn');
    if (clearTape) clearTape.addEventListener('click', clearAuditTape);

    const closeDrawer = document.getElementById('close-drawer-btn');
    if (closeDrawer) closeDrawer.addEventListener('click', toggleDrawer);

    const mobileToggle = document.getElementById('mobile-toggle-btn');
    if (mobileToggle) mobileToggle.addEventListener('click', toggleDrawer);

    const addMathBtn = document.getElementById('add-math-btn');
    if (addMathBtn) addMathBtn.addEventListener('click', addScientificRow);

    // Initial loaded display update
    updateDisplay();
});

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

// About modal open/close logic
document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('about-overlay');
    const modal = overlay ? overlay.querySelector('.about-modal') : null;
    const fabBtn = document.getElementById('about-fab-btn');
    const closeX = document.getElementById('about-close-x');

    if (!overlay || !modal || !fabBtn || !closeX) return;

    let previouslyFocused = null;

    function getFocusableElements() {
        return modal.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])');
    }

    function openAbout() {
        previouslyFocused = document.activeElement;
        overlay.classList.add('open');
        overlay.setAttribute('aria-hidden', 'false');
        setTimeout(function () { closeX.focus(); }, 50);
    }

    function closeAbout() {
        overlay.classList.remove('open');
        overlay.setAttribute('aria-hidden', 'true');
        if (previouslyFocused && previouslyFocused.focus) previouslyFocused.focus();
    }

    fabBtn.addEventListener('click', openAbout);
    closeX.addEventListener('click', closeAbout);
    overlay.addEventListener('click', function (e) {
        if (e.target === overlay) closeAbout();
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && overlay.classList.contains('open')) {
            closeAbout();
            e.stopImmediatePropagation();
        }
    });

    modal.addEventListener('keydown', function (e) {
        if (e.key !== 'Tab') return;
        var focusable = getFocusableElements();
        if (focusable.length === 0) return;
        var first = focusable[0];
        var last = focusable[focusable.length - 1];
        if (e.shiftKey) {
            if (document.activeElement === first) {
                e.preventDefault();
                last.focus();
            }
        } else {
            if (document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    });
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then((reg) => console.log('SW registered:', reg.scope))
            .catch((err) => console.warn('SW registration failed:', err));
    });
}
