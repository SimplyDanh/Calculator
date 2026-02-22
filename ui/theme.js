/* --- Theme Toggle --- */
function toggleTheme() {
    const body = document.body;
    body.classList.toggle('dark-theme');

    const checkbox = document.getElementById('checkbox');
    if (checkbox) {
        checkbox.checked = body.classList.contains('dark-theme');
    }
}

/* --- Custom Color Picker --- */
function togglePaletteDropdown(event) {
    if (event) event.stopPropagation();
    document.getElementById('theme-dropdown-container').classList.toggle('active');
}

function setThemeColor(btnEl, themeClass) {
    document.querySelectorAll('.theme-swatch').forEach(btn => btn.classList.remove('active'));
    btnEl.classList.add('active');

    document.body.classList.remove(
        'theme-teal', 'theme-terracotta', 'theme-forest',
        'theme-slate', 'theme-rosewood', 'theme-pistachio',
        'theme-purple', 'theme-aurora', 'theme-aurora-ocean',
        'theme-aurora-cyber', 'theme-aurora-sunset'
    );

    if (themeClass) {
        document.body.classList.add(themeClass);
    }

    togglePaletteDropdown(null);
}

// Close dropdown when clicking outside
document.addEventListener('click', (event) => {
    const dropdown = document.getElementById('theme-dropdown-container');
    if (dropdown && dropdown.classList.contains('active') && !dropdown.contains(event.target)) {
        dropdown.classList.remove('active');
    }
});

/* --- Chameleon Eye Tracking --- */
document.addEventListener('mousemove', (e) => {
    const mouseX = e.clientX;
    const mouseY = e.clientY;

    const pupil1 = document.getElementById('pupil1');
    const pupil2 = document.getElementById('pupil2');

    const movePupil = (pupil, maxRadius) => {
        if (!pupil) return;
        const rect = pupil.parentElement.getBoundingClientRect();
        const eyeCenterX = rect.left + rect.width / 2;
        const eyeCenterY = rect.top + rect.height / 2;

        const dx = mouseX - eyeCenterX;
        const dy = mouseY - eyeCenterY;
        const angle = Math.atan2(dy, dx);

        const dist = Math.min(maxRadius, Math.hypot(dx, dy) * 0.04);

        const tx = Math.cos(angle) * dist;
        const ty = Math.sin(angle) * dist;

        pupil.style.transform = `translate(${tx}px, ${ty}px)`;
    };

    requestAnimationFrame(() => {
        movePupil(pupil1, 6);
        movePupil(pupil2, 5);
    });
});
