/* Polyglots current site — 12-chat-dropdown.js. Keep this file as a classic script; inline handlers in the existing HTML depend on its global functions. */

function toggleModeDropdown() {
    const menu = document.getElementById('mode-dropdown-menu');
    if (menu) {
        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    }
}

document.addEventListener('click', function(event) {
    const menu = document.getElementById('mode-dropdown-menu');
    const btn = document.querySelector('.mode-chip-btn');
    if (menu && menu.style.display === 'block') {
        if (!menu.contains(event.target) && btn && !btn.contains(event.target)) {
            menu.style.display = 'none';
        }
    }
});
