/* Polyglots current site — 08-games-theme.js. Keep this file as a classic script; inline handlers in the existing HTML depend on its global functions. */

function renderGamesView(container) {
    container.innerHTML = `
        <div class="games-container">
            <h2 class="games-title">🎮 Games</h2>
            <p class="games-subtitle">Learn German while having fun!</p>
            <div class="games-grid">
                <div class="game-card" onclick="openGame('poly6_modified.html')">
                    <div class="game-card-icon">⚔️</div>
                    <div class="game-card-info">
                        <h3>Team Battle</h3>
                        <p>Play against a friend! Answer questions in teams!</p>
                    </div>
                </div>
                <div class="game-card" onclick="openGame('derdiedas.html')">
                    <div class="game-card-icon">🎯</div>
                    <div class="game-card-info">
                        <h3>Der Die Das</h3>
                        <p>Catch falling words and choose the correct article!</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function openGame(gameFile) {
    let overlay = document.getElementById('game-fullscreen-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'game-fullscreen-overlay';
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: #fff; z-index: 99999; display: flex; flex-direction: column;';
        document.body.appendChild(overlay);
    }
    overlay.innerHTML = `
        <div style="background: var(--burgundy-color, #800020); color: white; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; font-family: 'Cairo', sans-serif; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <span style="font-weight: bold; font-size: 18px;"><i class="fas fa-gamepad"></i> الألعاب التعليمية</span>
            <button onclick="closeGame()" style="background: #e74c3c; color: white; border: none; padding: 8px 18px; border-radius: 8px; cursor: pointer; font-weight: bold; font-family: 'Cairo', sans-serif; display: flex; align-items: center; gap: 6px; font-size: 14px; transition: transform 0.2s;">
                <i class="fas fa-times"></i> إغلاق اللعبة والعودة للموقع
            </button>
        </div>
        <iframe src="${gameFile}" style="flex-grow: 1; width: 100%; border: none;" allowfullscreen></iframe>
    `;
    overlay.style.display = 'flex';
}

function closeGame() {
    const overlay = document.getElementById('game-fullscreen-overlay');
    if (overlay) {
        overlay.style.display = 'none';
        overlay.innerHTML = '';
    }
}

function applyTheme() {
    const saved = localStorage.getItem('polyglots_theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);
}

init();
