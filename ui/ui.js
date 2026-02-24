// ui/ui.js

// About modal open/close logic with focus trap and ARIA management
(function () {
    const overlay = document.getElementById('about-overlay');
    if (!overlay) return;

    const modal = overlay.querySelector('.about-modal');
    const fabBtn = document.getElementById('about-fab-btn');
    const closeX = document.getElementById('about-close-x');
    
    if (!modal || !fabBtn || !closeX) return;

    let previouslyFocused = null;

    function getFocusableElements() {
        return modal.querySelectorAll(
            'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
    }

    function openAbout() {
        previouslyFocused = document.activeElement;
        overlay.classList.add('open');
        overlay.setAttribute('aria-hidden', 'false');
        // Focus the close button after opening
        setTimeout(function () { closeX.focus(); }, 50);
    }

    function closeAbout() {
        overlay.classList.remove('open');
        overlay.setAttribute('aria-hidden', 'true');
        // Restore focus to the element that opened the modal
        if (previouslyFocused && previouslyFocused.focus) {
            previouslyFocused.focus();
        }
    }

    fabBtn.addEventListener('click', openAbout);
    closeX.addEventListener('click', closeAbout);
    overlay.addEventListener('click', function (e) {
        if (e.target === overlay) closeAbout();
    });

    // Escape key closes modal
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && overlay.classList.contains('open')) {
            closeAbout();
            e.stopImmediatePropagation();
        }
    });

    // Focus trap — Tab/Shift+Tab cycle within the modal
    modal.addEventListener('keydown', function (e) {
        if (e.key !== 'Tab') return;
        const focusable = getFocusableElements();
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
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
})();
