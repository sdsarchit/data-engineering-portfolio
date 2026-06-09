/**
 * ARCHIT SOMAYAJULA PORTFOLIO SECURITY HARDENING AGENT
 * Active client-side protection for inspect defense.
 */

// 1. Disable right-click context menu
document.addEventListener('contextmenu', event => {
    event.preventDefault();
});

// 2. Disable devtools and view-source hotkeys
document.addEventListener('keydown', event => {
    // F12 Key
    if (event.keyCode === 123) {
        event.preventDefault();
        return false;
    }
    // Ctrl+Shift+I (Inspect Element), Ctrl+Shift+J (Developer Console), Ctrl+Shift+C (Inspect Hover)
    if (event.ctrlKey && event.shiftKey && (event.keyCode === 73 || event.keyCode === 74 || event.keyCode === 67)) {
        event.preventDefault();
        return false;
    }
    // Ctrl+U (View Source)
    if (event.ctrlKey && event.keyCode === 85) {
        event.preventDefault();
        return false;
    }
});

// 3. Trigger active debugger traps if DevTools gets bypassed and opened
(function() {
    const checkDebugger = function() {
        try {
            (function() {
                // Creates and executes: function() { debugger; }
                Function('debugger')();
            }());
        } catch (err) {}
    };
    
    // Periodically invoke debugger statements to stall inspections
    setInterval(() => {
        checkDebugger();
    }, 200);
})();
