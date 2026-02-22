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

        // Restore Theme (Depends on UI theme logic)
        if (state.darkMode && !document.body.classList.contains('dark-theme')) toggleTheme();
        if (!state.darkMode && document.body.classList.contains('dark-theme')) toggleTheme();

        const checkbox = document.getElementById('checkbox');
        if (checkbox) checkbox.checked = state.darkMode;

        if (state.theme) {
            const btn = document.querySelector('.theme-swatch[data-theme="' + state.theme + '"]');
            if (btn) setThemeColor(btn, state.theme);
        }

        // Restore Mode
        if (state.mode === 'scientific') setCalcMode('scientific');

        // Restore Audit Tape
        if (state.auditData && Array.isArray(state.auditData)) {
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
document.addEventListener('click', (e) => {
    if (e.target.closest('button')) triggerSave();
});
