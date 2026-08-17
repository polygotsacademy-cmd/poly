/* Polyglots current site — 01-router.js. Keep this file as a classic script; inline handlers in the existing HTML depend on its global functions. */

// View Switching
function switchView(view) {
    currentView = view;
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.view === view);
    });
    
    const searchBar = document.getElementById('search-bar-container');
    if (view === 'words') {
        searchBar.style.display = 'flex';
    } else {
        searchBar.style.display = 'none';
    }

    renderView();
}

function renderView() {
    const main = document.getElementById('main-content');
    main.innerHTML = '';

    switch (currentView) {
        case 'words': renderWordsView(main); break;
        case 'stories': renderStoriesView(main); break;
        case 'quizzes': renderQuizzesView(main); break;
        case 'pronunciation': renderPronunciationView(main); break;
        case 'chat': renderChatView(main); break;
        case 'games': renderGamesView(main); break;
        case 'messages': renderMessagesView(main); break;
        case 'leaderboard': renderLeaderboardView(main); break;
        case 'announcement': renderAnnouncementView(main); break;
    }
    if (window.applyLanguage) window.applyLanguage();
}
