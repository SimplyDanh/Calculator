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
        sidebar.classList.add('scientific-active');
        btnStd.classList.remove('active');
        btnSci.classList.add('active');
        sciContainer.classList.add('active');

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

    const mf = document.createElement('math-field');
    mf.setAttribute('virtual-keyboard-mode', 'manual');

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
            const expr = mf.getValue('ascii-math');
            if (!expr || expr.trim() === '') {
                resEl.textContent = '= ';
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

    mf.focus();
}

// Ensure MathLive virtual keyboard doesn't steal focus from the input field
window.addEventListener('DOMContentLoaded', () => {
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
