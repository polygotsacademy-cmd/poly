/* Polyglots current site — 05-stories.js. Keep this file as a classic script; inline handlers in the existing HTML depend on its global functions. */

function renderStoriesView(container) {
    if (stories.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:40px;"><p>No stories available.</p></div>`;
        return;
    }
    container.innerHTML = `<h2>📚 Short Stories</h2>
    <div class="stories-list">
        ${stories.map((s, index) => `
            <div class="story-card" onclick="showFullStory(${index})">
                <div class="story-number">${s.id}</div>
                <div class="story-info">
                    <h3>${s.title}</h3>
                    <p>${s.text.substring(0, 80)}...</p>
                </div>
                <div class="story-arrow"><i class="fas fa-chevron-right"></i></div>
            </div>
        `).join('')}
    </div>`;
}

function showFullStory(index) {
    const story = stories[index];
    const main = document.getElementById('main-content');

    const audioPlayer = story.audio ? `
        <div class="story-audio-player">
            <p style="margin-bottom:8px; font-size:14px; color:#555;"><i class="fas fa-headphones"></i> Listen to the story:</p>
            <audio controls preload="none"><source src="${story.audio}" type="audio/mpeg"></audio>
        </div>` : '';
    
    main.innerHTML = `
        <div class="story-full-view">
            <button class="back-btn" onclick="switchView('stories')"><i class="fas fa-arrow-left"></i> Back to Stories</button>
            <div class="story-header"><h2>${story.title}</h2></div>
            ${audioPlayer}
            <div class="story-text-box">
                <p class="german-text">${story.text}</p>
                <hr>
                <p class="arabic-translation">${story.translation}</p>
            </div>
        </div>`;

    const storyAudio = main.querySelector('.story-audio-player audio');
    if (storyAudio) {
        storyAudio.addEventListener('ended', () => {
            const storyKey = `listened_story_${story.id}`;
            if (!sessionStorage.getItem(storyKey)) {
                sessionStorage.setItem(storyKey, 'true');
                awardPoints(10, 'Listened to the full story');
            }
        }, { once: true });
    }
    main.scrollTop = 0;
}
