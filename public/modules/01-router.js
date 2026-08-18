/* Polyglots current site — 01-router.js. Keep this file as a classic script; inline handlers in the existing HTML depend on its global functions. */

// View Switching
function switchView(view) {
    if (typeof isSectionAllowed === 'function' && !isSectionAllowed(view)) {
        const fallback = ['words', 'stories', 'quizzes', 'daily', 'pronunciation', 'games', 'chat', 'messages', 'leaderboard'].find(candidate => isSectionAllowed(candidate));
        if (!fallback) return;
        view = fallback;
    }
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
        case 'daily': renderDailyQuizView(main); break;
        case 'pronunciation': renderPronunciationView(main); break;
        case 'chat': renderChatView(main); break;
        case 'games': renderGamesView(main); break;
        case 'messages': renderMessagesView(main); break;
        case 'leaderboard': renderLeaderboardView(main); break;
        case 'announcement': renderAnnouncementView(main); break;
        case 'admin': renderAdminView(main); break;
    }
}
