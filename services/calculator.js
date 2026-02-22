/* --- Global Calculator State --- */
let calcState = {
    currentValue: '0',
    previousValue: null,
    operator: null,
    resetNext: false,
    memoryValue: 0
};

function calcDigit(digit) {
    if (calcState.resetNext) {
        calcState.currentValue = digit;
        calcState.resetNext = false;
    } else {
        // Input length guard
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

function calcOp(op) {
    if (op === '+/-') {
        if (calcState.currentValue !== '0' && calcState.currentValue !== '0.') {
            if (calcState.currentValue.startsWith('-')) {
                calcState.currentValue = calcState.currentValue.substring(1);
            } else {
                calcState.currentValue = '-' + calcState.currentValue;
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
        const prevObj = document.getElementById('main-calc-prev');
        if (prevObj) prevObj.textContent = '';
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
