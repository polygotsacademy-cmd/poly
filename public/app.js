// App State
let words = [];
let stories = [];
let quizzes = [];
let materials = [];
let messages = [];
let currentUser = null;
let currentView = 'words';
let currentCategory = 'Alle';
let chatMessages = [];
let isTyping = false;
let isChatSending = false;
let currentChatMode = 'translator'; // translator, teacher, homework, voice
let selectedImage = null;
let selectedAudio = null;
let mediaRecorder = null;
let audioChunks = [];
let recordingInterval = null;
let recordingTime = 0;

// Quiz State
let selectedQuizCategory = null;
let selectedQuizMode = null;
let quizWords = [];
let currentQuizIndex = 0;
let quizScore = 0;
let quizAnswered = false;
let selectedAnswer = null;
let spellingInput = "";

// Audio URLs
const SFX_SUCCESS = "https://cdn.pixabay.com/audio/2021/08/04/audio_bbd1614906.mp3";
const SFX_ERROR = "https://cdn.pixabay.com/audio/2022/03/10/audio_c978b77527.mp3";

// Initialize App
async function init() {
    await loadData();
    setupEventListeners();
    await checkRememberedUser();
    applyTheme();
}

async function loadData() {
    try {
        const [wordsRes, storiesRes, quizzesRes, materialsRes, messagesRes] = await Promise.all([
            fetch('words.json').then(r => r.json()),
            fetch('stories.json').then(r => r.json()),
            fetch('quizzes.json').then(r => r.json()),
            fetch('materials.json').then(r => r.json()),
            fetch('messages.json').then(r => r.json())
        ]);
        words = wordsRes;
        stories = storiesRes;
        quizzes = quizzesRes;
        materials = materialsRes;
        messages = messagesRes;
        console.log('Data loaded:', { words: words.length, stories: stories.length, quizzes: quizzes.length, materials: materials.length, messages: messages.length });
    } catch (e) {
        console.error("Failed to load data", e);
    }
}

function setupEventListeners() {
    // Login
    document.getElementById('login-form').addEventListener('submit', handleLogin);

    // Sidebar Toggle
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            toggleOverlay(sidebar.classList.contains('open'));
        });
    }

    // Bell Click
    const bell = document.getElementById('notification-bell');
    if (bell) {
        bell.addEventListener('click', () => {
            switchView('messages');
        });
    }

    // Nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            switchView(item.dataset.view);
            if (sidebar) sidebar.classList.remove('open');
            toggleOverlay(false);
        });
    });

    // Search
    document.getElementById('searchInput').addEventListener('input', handleSearch);
}

function toggleOverlay(show) {
    let overlay = document.querySelector('.sidebar-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        document.getElementById('app-container').appendChild(overlay);
        overlay.addEventListener('click', () => {
            document.getElementById('sidebar').classList.remove('open');
            toggleOverlay(false);
        });
    }
    overlay.classList.toggle('active', show);
}

// Auth Logic
async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const remember = document.getElementById('remember').checked;

    try {
        // Simple mock login for local testing if API doesn't exist
        // In a real app, this would be a real API call
        if (username === "admin" && password === "admin") {
             currentUser = { username: "Polyglot" };
             if (remember) {
                localStorage.setItem('polyglots_user', JSON.stringify({ username, password }));
            }
            showApp();
            switchView('words');
            window.scrollTo(0, 0);
            return;
        }

        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();

        if (data.success) {
            currentUser = data.user;
            if (remember) {
                localStorage.setItem('polyglots_user', JSON.stringify({ username, password }));
            }
            showApp();
            switchView('words');
            window.scrollTo(0, 0);
        } else {
            document.getElementById('login-error').innerText = data.error || 'Login failed';
        }
    } catch (err) {
        // Fallback for demo purposes if server is not running
        if (username && password) {
            currentUser = { username };
            showApp();
            switchView('words');
        } else {
            document.getElementById('login-error').innerText = 'Server error. Please try again.';
        }
    }
}

async function checkRememberedUser() {
    const saved = localStorage.getItem('polyglots_user');
    if (saved) {
        const { username, password } = JSON.parse(saved);
        try {
            if (username === "admin" && password === "admin") {
                currentUser = { username: "Polyglot" };
                showApp();
                switchView('words');
                return;
            }
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (data.success) {
                currentUser = data.user;
                showApp();
                switchView('words');
                return;
            }
        } catch (err) {
            console.error('Auto-login failed:', err);
        }
    }
}

function showApp() {
    document.getElementById('login-screen').classList.remove('active');
    document.getElementById('app-container').classList.add('active');
    checkNotifications();
    renderView();
}

function checkNotifications() {
    if (!currentUser) return;
    const userMessages = messages.filter(m => m.targetUsers.includes(currentUser.username));
    const badge = document.getElementById('notification-badge');
    if (badge) {
        if (userMessages.length > 0) {
            badge.classList.add('active');
        } else {
            badge.classList.remove('active');
        }
    }
}

// View Switching
function switchView(view) {
    currentView = view;
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.view === view);
    });
    
    // Hide/Show Search Bar based on view
    const searchBar = document.getElementById('search-bar-container');
    if (view === 'words') {
        searchBar.style.display = 'block';
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
        case 'materials': renderMaterialsView(main); break;
        case 'pronunciation': renderPronunciationView(main); break;
        case 'chat': renderChatView(main); break;
        case 'games': renderGamesView(main); break;
        case 'messages': renderMessagesView(main); break;
    }
}

function renderMessagesView(container) {
    if (!currentUser) {
        container.innerHTML = '<div style="text-align:center; padding:40px;">Please login to see messages.</div>';
        return;
    }

    const userMessages = messages.filter(m => m.targetUsers.includes(currentUser.username));
    
    const html = `
        <div class="view-header" style="padding: 10px 20px; text-align: right;">
            <h2 style="color: var(--primary-color); font-family: 'Cairo', sans-serif;"><i class="fas fa-envelope"></i> الرسائل</h2>
        </div>
        <div id="messages-section" style="padding: 0 15px;">
            ${userMessages.length > 0 ? userMessages.map(m => `
                <div class="message-card">
                    <h3>${m.title}</h3>
                    <p>${m.content}</p>
                </div>
            `).join('') : '<div style="text-align:center; padding:40px;">لا توجد رسائل جديدة</div>'}
        </div>
    `;
    container.innerHTML = html;
    
    // Clear badge when viewing messages
    const badge = document.getElementById('notification-badge');
    if (badge) badge.classList.remove('active');
}

// View Renderers
function renderWordsView(container) {
    const searchInput = document.getElementById('searchInput');
    const search = searchInput ? searchInput.value.toLowerCase().trim() : '';
    
    if (search.length > 0) {
        const filteredWords = words.filter(w => 
            w.word.toLowerCase().includes(search) || 
            w.ar.includes(search) ||
            w.cat.toLowerCase().includes(search)
        );
        renderWordCards(container, filteredWords, `نتائج البحث عن "${search}"`);
        return;
    }

    if (currentCategory === 'Alle') {
        renderCategoryList(container);
    } else {
        const filteredWords = words.filter(w => w.cat === currentCategory);
        renderWordCards(container, filteredWords, currentCategory, true);
    }
}

function renderCategoryList(container) {
    const categories = [...new Set(words.map(w => w.cat))];
    const catData = categories.map(cat => {
        const firstWord = words.find(w => w.cat === cat);
        return { name: cat, emoji: firstWord ? firstWord.emoji : '📁' };
    });

    const html = `
        <div class="category-header" style="text-align: right; padding: 10px 20px;">
            <h2 style="color: var(--primary-color); font-family: 'Cairo', sans-serif;"><i class="fas fa-th-large"></i> التصنيفات</h2>
        </div>
        <div class="categories-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 15px; padding: 15px;">
            ${catData.map(cat => `
                <div class="category-card" onclick="setCategory('${cat.name}')" style="background: white; border-radius: 15px; padding: 20px; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.05); cursor: pointer; transition: transform 0.2s;">
                    <div class="cat-emoji" style="font-size: 40px; margin-bottom: 10px;">${cat.emoji}</div>
                    <div class="cat-name" style="font-weight: bold; color: #333; font-family: 'Cairo', sans-serif;">${cat.name}</div>
                    <div class="cat-count" style="font-size: 12px; color: #888; margin-top: 5px;">${words.filter(w => w.cat === cat.name).length} كلمة</div>
                </div>
            `).join('')}
        </div>
    `;
    container.innerHTML = html;
}

function renderWordCards(container, filteredWords, title, showBack = false) {
    const backBtn = showBack ? `<button class="back-btn" onclick="setCategory('Alle')" style="background: #f0f0f0; border: none; padding: 8px 15px; border-radius: 10px; cursor: pointer; margin-bottom: 15px; font-family: 'Cairo', sans-serif;"><i class="fas fa-arrow-left"></i> العودة للتصنيفات</button>` : '';
    
    const cardsHtml = `
        <div class="view-header" style="padding: 10px 20px; text-align: right;">
            ${backBtn}
            <h2 style="color: var(--primary-color); font-family: 'Cairo', sans-serif;">${title}</h2>
        </div>
        <div class="cards-container">
            ${filteredWords.length > 0 ? filteredWords.map(w => `
                <div class="card" onclick="this.classList.toggle('flipped')">
                    <div class="card-inner">
                        <div class="card-front ${w.art}">
                            <span class="emoji">${w.emoji}</span>
                            <div class="word-container">
                                ${w.art ? `<span class="article ${w.art}">${w.art}</span>` : ''}
                                <span class="word">${w.word}</span>
                            </div>
                        </div>
                        <div class="card-back">
                            <span class="arabic-trans">${w.ar}</span>
                            <span class="plural-form">${w.pl}</span>
                            <button class="btn-audio" onclick="event.stopPropagation(); playWordAudio(${w.id})">🔊</button>
                        </div>
                    </div>
                </div>
            `).join('') : '<div style="text-align:center; padding:40px; grid-column: 1/-1;">لا توجد نتائج مطابقة</div>'}
        </div>`;
    
    container.innerHTML = cardsHtml;
    window.scrollTo(0, 0);
}

function setCategory(cat) {
    currentCategory = cat;
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    renderView();
}

function handleSearch() {
    if (currentView === 'words') renderView();
}

// Materials View
function renderMaterialsView(container) {
    const groups = ["Alle", "Sa10:00", "Sa12:00", "Sa01:30", "De6:00"];
    let selectedGroup = localStorage.getItem('selected_group') || "Alle";

    const filterHtml = `<div class="materials-filter">
        ${groups.map(g => `<button class="cat-btn ${selectedGroup === g ? 'active' : ''}" onclick="setMaterialGroup('${g}')">${g}</button>`).join('')}
    </div>`;

    const filtered = materials.filter(m => selectedGroup === 'Alle' || m.group === selectedGroup);

    const contentHtml = filtered.length > 0 
        ? filtered.map(m => `
            <div class="material-card">
                <span class="badge ${m.type}">${m.type.toUpperCase()}</span>
                <h3>${m.title}</h3>
                <p>${m.description}</p>
                <div class="deadline">Deadline: ${m.deadline}</div>
                ${m.link ? `<a href="${m.link}" target="_blank" class="material-btn">Open Link</a>` : ''}
            </div>
        `).join('')
        : `<div class="empty-state" style="text-align:center; padding:40px;">
            لا يوجد واجبات لمجموعتك حالياً.. استمتع بوقتك يا بطل! 🥳
          </div>`;

    container.innerHTML = filterHtml + contentHtml;
}

function setMaterialGroup(group) {
    localStorage.setItem('selected_group', group);
    renderView();
}

// Pronunciation View
function renderPronunciationView(container) {
    container.innerHTML = `
        <div class="pronunciation-container">
            <h2>🗣️ German Pronunciation</h2>
            <p style="margin-bottom:15px; font-size:14px; color:#777;">Write any German word or sentence and listen to its pronunciation.</p>
            <textarea id="pronounce-text" placeholder="Type German words or sentences here..."></textarea>
            <div class="pronunciation-btns">
                <button class="listen-btn" onclick="playGerman(document.getElementById('pronounce-text').value)">Listen 🔊</button>
                <button class="clear-btn" onclick="document.getElementById('pronounce-text').value = ''">Clear 🗑️</button>
            </div>
        </div>
    `;
}

// Audio Helpers
function playGerman(text) {
    if (!text) return;
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'de-DE';
        utterance.rate = 0.85;
        const voices = window.speechSynthesis.getVoices();
        const germanVoice = voices.find(v => v.lang.startsWith('de')) || voices.find(v => v.lang.includes('de'));
        if (germanVoice) utterance.voice = germanVoice;
        window.speechSynthesis.speak(utterance);
    }
}

function playWordAudio(wordId) {
    const wordObj = words.find(w => w.id === wordId);
    if (!wordObj) return;
    const audioPath = `audio/words/word_${wordId}.mp3`;
    const audio = new Audio(audioPath);
    audio.onerror = () => playGerman(wordObj.art ? `${wordObj.art} ${wordObj.word}` : wordObj.word);
    audio.play().catch(() => playGerman(wordObj.art ? `${wordObj.art} ${wordObj.word}` : wordObj.word));
}

function playSFX(url) {
    const audio = new Audio(url);
    audio.play().catch(e => console.log("SFX play error", e));
}

// Stories View
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
            <p style="margin-bottom:8px; font-size:14px; color:#555;"><i class="fas fa-headphones"></i> استمع للقصة:</p>
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
    main.scrollTop = 0;
}

// --- NEW QUIZ SYSTEM ---

function renderQuizzesView(container) {
    if (selectedQuizCategory) {
        if (selectedQuizMode) {
            renderQuizMode(container);
        } else {
            renderQuizModesSelection(container);
        }
    } else {
        renderQuizCategorySelection(container);
    }
}

function renderQuizCategorySelection(container) {
    const categories = [...new Set(words.map(w => w.cat))];
    const catData = categories.map(cat => {
        const firstWord = words.find(w => w.cat === cat);
        return { name: cat, emoji: firstWord ? firstWord.emoji : '📁' };
    });

    container.innerHTML = `
        <div class="quiz-intro" style="text-align: center; padding: 20px;">
            <h2 style="font-family: 'Cairo', sans-serif; color: var(--primary-color);">📝 اختبر معلوماتك</h2>
            <p style="color: #666; margin-bottom: 20px;">اختر التصنيف الذي تريد التدرب عليه</p>
        </div>
        <div class="categories-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 15px; padding: 15px;">
            ${catData.map(cat => `
                <div class="category-card" onclick="selectQuizCategory('${cat.name}')" style="background: white; border-radius: 15px; padding: 20px; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.05); cursor: pointer; transition: all 0.3s ease;">
                    <div class="cat-emoji" style="font-size: 40px; margin-bottom: 10px;">${cat.emoji}</div>
                    <div class="cat-name" style="font-weight: bold; color: #333; font-family: 'Cairo', sans-serif;">${cat.name}</div>
                    <div class="cat-count" style="font-size: 12px; color: #888; margin-top: 5px;">${words.filter(w => w.cat === cat.name).length} كلمة</div>
                </div>
            `).join('')}
        </div>
    `;
}

function selectQuizCategory(cat) {
    selectedQuizCategory = cat;
    selectedQuizMode = null;
    renderView();
}

function renderQuizModesSelection(container) {
    container.innerHTML = `
        <div class="quiz-modes-view" style="padding: 20px; text-align: center; animation: fadeIn 0.5s;">
            <button class="back-btn" onclick="selectedQuizCategory=null; renderView();" style="float: right; background: #eee; border: none; padding: 8px 15px; border-radius: 10px; cursor: pointer;"><i class="fas fa-arrow-left"></i> رجوع</button>
            <h2 style="font-family: 'Cairo', sans-serif; margin-bottom: 30px; clear: both;">اختر نمط الاختبار: ${selectedQuizCategory}</h2>
            
            <div class="modes-container" style="display: flex; flex-direction: column; gap: 20px; max-width: 400px; margin: 0 auto;">
                <div class="mode-card" onclick="startQuizMode('flashcards')" style="background: white; padding: 25px; border-radius: 20px; box-shadow: 0 5px 15px rgba(0,0,0,0.08); cursor: pointer; transition: transform 0.2s;">
                    <div style="font-size: 40px; margin-bottom: 10px;">🎴</div>
                    <h3 style="font-family: 'Cairo', sans-serif;">نمط الكروت (Flashcards)</h3>
                    <p style="font-size: 14px; color: #777;">كروت تظهر بالألمانية وتتقلب لتظهر المعنى بالعربي</p>
                </div>
                
                <div class="mode-card" onclick="startQuizMode('mcq')" style="background: white; padding: 25px; border-radius: 20px; box-shadow: 0 5px 15px rgba(0,0,0,0.08); cursor: pointer; transition: transform 0.2s;">
                    <div style="font-size: 40px; margin-bottom: 10px;">🎯</div>
                    <h3 style="font-family: 'Cairo', sans-serif;">اختيار من متعدد (MCQ)</h3>
                    <p style="font-size: 14px; color: #777;">اختر المعنى الصحيح من بين 4 اختيارات</p>
                </div>
                
                <div class="mode-card" onclick="startQuizMode('spelling')" style="background: white; padding: 25px; border-radius: 20px; box-shadow: 0 5px 15px rgba(0,0,0,0.08); cursor: pointer; transition: transform 0.2s;">
                    <div style="font-size: 40px; margin-bottom: 10px;">✍️</div>
                    <h3 style="font-family: 'Cairo', sans-serif;">نمط الكتابة (Spelling)</h3>
                    <p style="font-size: 14px; color: #777;">اكتب الكلمة بالألمانية بشكل صحيح</p>
                </div>
            </div>
        </div>
    `;
}

function startQuizMode(mode) {
    selectedQuizMode = mode;
    quizWords = words.filter(w => w.cat === selectedQuizCategory).sort(() => Math.random() - 0.5);
    currentQuizIndex = 0;
    quizScore = 0;
    quizAnswered = false;
    selectedAnswer = null;
    spellingInput = "";
    renderView();
}

function renderQuizMode(container) {
    if (currentQuizIndex >= quizWords.length) {
        renderQuizResult(container);
        return;
    }

    const word = quizWords[currentQuizIndex];
    
    let modeHtml = "";
    if (selectedQuizMode === 'flashcards') {
        modeHtml = renderFlashcardsUI(word);
    } else if (selectedQuizMode === 'mcq') {
        modeHtml = renderMCQUI(word);
    } else if (selectedQuizMode === 'spelling') {
        modeHtml = renderSpellingUI(word);
    }

    container.innerHTML = `
        <div class="quiz-container-active" style="padding: 15px; animation: slideIn 0.4s;">
            <div class="quiz-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <span style="font-weight: bold; color: var(--primary-color);">${currentQuizIndex + 1} / ${quizWords.length}</span>
                <button onclick="selectedQuizMode=null; renderView();" style="background: none; border: none; color: #999; cursor: pointer;"><i class="fas fa-times"></i> إنهاء</button>
            </div>
            ${modeHtml}
        </div>
    `;
}

function renderFlashcardsUI(word) {
    return `
        <div class="flashcard-quiz-view" style="perspective: 1000px; height: 350px; margin: 20px auto; max-width: 300px;">
            <div class="card" onclick="this.classList.toggle('flipped')" style="height: 100%; width: 100%;">
                <div class="card-inner">
                    <div class="card-front ${word.art}" style="display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 20px;">
                        <span style="font-size: 80px;">${word.emoji}</span>
                        <div style="text-align: center;">
                            ${word.art ? `<span class="article ${word.art}">${word.art}</span>` : ''}
                            <span class="word" style="font-size: 32px; display: block;">${word.word}</span>
                        </div>
                        <p style="font-size: 14px; color: rgba(255,255,255,0.7); position: absolute; bottom: 20px;">اضغط للقلب 👆</p>
                    </div>
                    <div class="card-back" style="display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 20px;">
                        <span style="font-size: 40px; font-family: 'Cairo', sans-serif; font-weight: bold;">${word.ar}</span>
                        <span style="font-size: 18px; color: #777;">${word.pl !== '-' ? 'Plural: ' + word.pl : ''}</span>
                        <button class="btn-audio" onclick="event.stopPropagation(); playWordAudio(${word.id})">🔊 استمع</button>
                    </div>
                </div>
            </div>
        </div>
        <div style="text-align: center; margin-top: 30px;">
            <button class="next-btn" onclick="nextQuizQuestion()">الكلمة التالية ➡️</button>
        </div>
    `;
}

function renderMCQUI(word) {
    // Generate distractors
    const sameCatWords = words.filter(w => w.cat === selectedQuizCategory && w.id !== word.id);
    const distractors = sameCatWords.sort(() => Math.random() - 0.5).slice(0, 3).map(w => w.ar);
    const options = [word.ar, ...distractors].sort(() => Math.random() - 0.5);

    const optionsHtml = options.map(opt => {
        let classes = "quiz-option";
        if (quizAnswered) {
            classes += " disabled";
            if (opt === word.ar) classes += " correct";
            else if (opt === selectedAnswer) classes += " wrong";
        }
        return `<button class="${classes}" onclick="answerMCQ('${opt.replace(/'/g, "\\'")}', '${word.ar.replace(/'/g, "\\'")}')">${opt}</button>`;
    }).join('');

    return `
        <div class="mcq-quiz-view">
            <div class="question-box" style="background: white; padding: 40px 20px; border-radius: 20px; text-align: center; margin-bottom: 25px; box-shadow: 0 5px 15px rgba(0,0,0,0.05);">
                <span style="font-size: 50px; display: block; margin-bottom: 10px;">${word.emoji}</span>
                <h2 style="font-size: 32px; color: var(--navy-color);">${word.art ? word.art + ' ' : ''}${word.word}</h2>
                <p style="color: #888; margin-top: 10px;">ما معنى هذه الكلمة؟</p>
            </div>
            <div class="quiz-options">
                ${optionsHtml}
            </div>
            ${quizAnswered ? `<div style="text-align: center; margin-top: 25px;"><button class="next-btn" onclick="nextQuizQuestion()">التالي ➡️</button></div>` : ''}
        </div>
    `;
}

function answerMCQ(selected, correct) {
    if (quizAnswered) return;
    selectedAnswer = selected;
    quizAnswered = true;
    if (selected === correct) {
        quizScore++;
        playSFX(SFX_SUCCESS);
    } else {
        playSFX(SFX_ERROR);
    }
    renderView();
}

function renderSpellingUI(word) {
    return `
        <div class="spelling-quiz-view">
            <div class="question-box" style="background: white; padding: 30px 20px; border-radius: 20px; text-align: center; margin-bottom: 25px; box-shadow: 0 5px 15px rgba(0,0,0,0.05);">
                <span style="font-size: 60px; display: block; margin-bottom: 10px;">${word.emoji}</span>
                <h2 style="font-family: 'Cairo', sans-serif; color: var(--navy-color);">${word.ar}</h2>
                <p style="color: #888; margin-top: 10px;">اكتب الكلمة بالألمانية</p>
            </div>
            
            <div class="input-container" style="max-width: 400px; margin: 0 auto;">
                <input type="text" id="spelling-input" value="${spellingInput}" placeholder="اكتب هنا..." 
                    style="width: 100%; padding: 15px 20px; border: 2px solid #eee; border-radius: 15px; font-size: 20px; text-align: center; outline: none; transition: border-color 0.3s;"
                    ${quizAnswered ? 'disabled' : ''} oninput="spellingInput = this.value">
                
                ${quizAnswered ? `
                    <div class="feedback-spelling" style="margin-top: 20px; text-align: center; padding: 15px; border-radius: 15px; background: ${spellingInput.toLowerCase().trim() === word.word.toLowerCase().trim() ? '#eafaf1' : '#fdedec'};">
                        <p style="font-weight: bold; color: ${spellingInput.toLowerCase().trim() === word.word.toLowerCase().trim() ? '#27ae60' : '#c0392b'};">
                            ${spellingInput.toLowerCase().trim() === word.word.toLowerCase().trim() ? '✅ إجابة صحيحة!' : '❌ إجابة خاطئة!'}
                        </p>
                        <p style="margin-top: 5px;">الإجابة الصحيحة: <span style="font-weight: bold; font-size: 20px;">${word.art ? word.art + ' ' : ''}${word.word}</span></p>
                        <button class="btn-audio" onclick="playWordAudio(${word.id})" style="margin-top: 10px;">🔊 استمع</button>
                    </div>
                ` : `
                    <button class="start-quiz-btn" onclick="checkSpelling('${word.word.replace(/'/g, "\\'")}')" style="width: 100%; margin-top: 20px;">تحقق ✅</button>
                `}
            </div>
            
            ${quizAnswered ? `<div style="text-align: center; margin-top: 25px;"><button class="next-btn" onclick="nextQuizQuestion()">التالي ➡️</button></div>` : ''}
        </div>
    `;
}

function checkSpelling(correct) {
    if (quizAnswered) return;
    quizAnswered = true;
    const userVal = spellingInput.toLowerCase().trim();
    const correctVal = correct.toLowerCase().trim();
    if (userVal === correctVal) {
        quizScore++;
        playSFX(SFX_SUCCESS);
    } else {
        playSFX(SFX_ERROR);
    }
    renderView();
}

function nextQuizQuestion() {
    currentQuizIndex++;
    quizAnswered = false;
    selectedAnswer = null;
    spellingInput = "";
    renderView();
}

function renderQuizResult(container) {
    const percentage = Math.round((quizScore / quizWords.length) * 100);
    let emoji = percentage >= 80 ? '🏆' : percentage >= 60 ? '⭐' : '💪';
    let message = percentage >= 80 ? 'أحسنت صنعاً يا بطل!' : percentage >= 60 ? 'عمل جيد، استمر في التدرب!' : 'لا بأس، حاول مرة أخرى!';

    container.innerHTML = `
        <div class="quiz-result" style="text-align: center; padding: 40px 20px; animation: scaleIn 0.5s;">
            <div style="font-size: 80px; margin-bottom: 20px;">${emoji}</div>
            <h2 style="font-family: 'Cairo', sans-serif;">اكتمل الاختبار!</h2>
            <p style="font-size: 20px; margin: 10px 0;">${message}</p>
            <div class="result-score" style="font-size: 60px; font-weight: 900; color: var(--burgundy-color); margin: 20px 0;">${quizScore} / ${quizWords.length}</div>
            <p class="result-percent" style="font-size: 24px; color: #777; margin-bottom: 30px;">نسبة النجاح: ${percentage}%</p>
            
            <div style="display: flex; flex-direction: column; gap: 15px; max-width: 300px; margin: 0 auto;">
                <button class="start-quiz-btn" onclick="startQuizMode('${selectedQuizMode}')">إعادة الاختبار 🔄</button>
                <button class="back-btn" onclick="selectedQuizMode=null; renderView();" style="background: #f0f0f0; border: none; padding: 12px; border-radius: 25px; cursor: pointer; font-weight: bold;">تغيير النمط ⚙️</button>
                <button class="back-btn" onclick="selectedQuizCategory=null; selectedQuizMode=null; renderView();" style="background: none; border: none; color: #888; cursor: pointer;">العودة للتصنيفات</button>
            </div>
        </div>
    `;
}

// --- END NEW QUIZ SYSTEM ---

function getDailyUsage() {
    const today = new Date().toISOString().split('T')[0];
    const usage = JSON.parse(localStorage.getItem('polyglots_usage') || '{}');
    if (usage.date !== today) {
        return { date: today, images: 0, voice: 0 };
    }
    return usage;
}

function updateDailyUsage(type) {
    const usage = getDailyUsage();
    usage[type]++;
    localStorage.setItem('polyglots_usage', JSON.stringify(usage));
}

function renderChatView(container) {
    const usage = getDailyUsage();
    const gliderPos = {
        'translator': '0%',
        'teacher': '100%',
        'homework': '200%',
        'voice': '300%'
    }[currentChatMode];

    container.innerHTML = `
        <div class="polyglots-chat-container">
            <div class="chat-header-poly">
                <h2>Polyglots AI</h2>
            </div>
            
            <div class="mode-switcher">
                <div class="mode-glider" style="transform: translateX(${gliderPos})"></div>
                <button class="mode-btn ${currentChatMode === 'translator' ? 'active' : ''}" onclick="setChatMode('translator')">مترجم</button>
                <button class="mode-btn ${currentChatMode === 'teacher' ? 'active' : ''}" onclick="setChatMode('teacher')">مدرس</button>
                <button class="mode-btn ${currentChatMode === 'homework' ? 'active' : ''}" onclick="setChatMode('homework')">حل الواجب</button>
                <button class="mode-btn ${currentChatMode === 'voice' ? 'active' : ''}" onclick="setChatMode('voice')">اختبار صوتي</button>
            </div>

            <div class="chat-messages-poly" id="chat-messages">
                ${chatMessages.length === 0 ? `
                    <div style="text-align:center; padding:40px; color:#999;">
                        <i class="fas fa-robot" style="font-size:40px; margin-bottom:15px;"></i>
                        <p>أهلاً بك في Polyglots AI!<br>اختر النمط المناسب وابدأ التعلم.</p>
                    </div>
                ` : chatMessages.map(msg => `
                    <div class="msg-poly ${msg.role}">
                        <div class="msg-content">
                            ${msg.image ? `<img src="${msg.image}">` : ''}
                            ${msg.audio ? `<audio controls src="${msg.audio}"></audio>` : ''}
                            <div>${msg.content}</div>
                        </div>
                    </div>
                `).join('')}
                ${isTyping ? '<div class="msg-poly ai">... جاري التفكير</div>' : ''}
            </div>

            <div id="media-preview" class="media-preview"></div>

            <div class="chat-input-poly">
                <div class="input-wrapper">
                    <button class="icon-btn" onclick="triggerImageUpload()"><i class="fas fa-camera"></i></button>
                    <button class="icon-btn" id="mic-btn" onclick="toggleVoiceRecording()"><i class="fas fa-microphone"></i></button>
                    <input type="text" id="chat-input" placeholder="اكتب هنا..." onkeypress="if(event.key === 'Enter') sendMessage()">
                    <button class="send-btn-poly" onclick="sendMessage()"><i class="fas fa-paper-plane"></i></button>
                </div>
                <div class="chat-counters">
                    <span class="counter-item">الصور: ${usage.images}/3</span>
                    <span class="counter-item">الصوت: ${usage.voice}/3</span>
                </div>
            </div>
            <input type="file" id="image-input" hidden accept="image/*" onchange="handleImageSelect(event)">
        </div>
    `;
    
    setTimeout(() => {
        const chatMsgs = document.getElementById('chat-messages');
        if (chatMsgs) chatMsgs.scrollTop = chatMsgs.scrollHeight;
    }, 100);
}

function setChatMode(mode) {
    currentChatMode = mode;
    renderView();
}

function triggerImageUpload() {
    const usage = getDailyUsage();
    if (usage.images >= 3) {
        alert("يا بطل، أنت خلصت الـ 3 صور بتوع النهاردة! استنى لبكرة بقى. 😊");
        return;
    }
    document.getElementById('image-input').click();
}

function handleImageSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        selectedImage = e.target.result;
        showMediaPreview('image', selectedImage);
    };
    reader.readAsDataURL(file);
}

function showMediaPreview(type, src) {
    const preview = document.getElementById('media-preview');
    if (!preview) return;
    preview.style.display = 'flex';
    preview.innerHTML = `
        ${type === 'image' ? `<img src="${src}" class="preview-thumb">` : '<i class="fas fa-volume-up"></i> تسجيل صوتي جاهز'}
        <span class="remove-media" onclick="clearMedia()"><i class="fas fa-times-circle"></i></span>
    `;
}

function clearMedia() {
    selectedImage = null;
    selectedAudio = null;
    const preview = document.getElementById('media-preview');
    if (preview) preview.style.display = 'none';
}

async function toggleVoiceRecording() {
    const usage = getDailyUsage();
    if (usage.voice >= 3) {
        alert("يا بطل، أنت خلصت الـ 3 تسجيلات بتوع النهاردة! استنى لبكرة بقى. 😊");
        return;
    }

    const micBtn = document.getElementById('mic-btn');
    
    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
        micBtn.classList.remove('recording-active');
        clearInterval(recordingInterval);
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        recordingTime = 0;

        mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            const reader = new FileReader();
            reader.onload = (e) => {
                selectedAudio = e.target.result;
                showMediaPreview('audio', selectedAudio);
            };
            reader.readAsDataURL(audioBlob);
            stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        micBtn.classList.add('recording-active');
        
        recordingInterval = setInterval(() => {
            recordingTime++;
            if (recordingTime >= 20) {
                toggleVoiceRecording();
            }
        }, 1000);

    } catch (err) {
        alert("لازم تدينا إذن المايك عشان تقدر تسجل صوتك!");
    }
}

async function sendMessage() {
    const input = document.getElementById('chat-input');
    const text = input ? input.value.trim() : '';
    if ((!text && !selectedImage && !selectedAudio) || isChatSending) return;

    const userMsg = { 
        role: 'user', 
        content: text,
        image: selectedImage,
        audio: selectedAudio
    };
    
    chatMessages.push(userMsg);
    
    const payload = {
        mode: currentChatMode,
        text: text,
        image: selectedImage || null,
        audio: selectedAudio || null,
        history: chatMessages.slice(-6, -1)
    };

    if (selectedImage) updateDailyUsage('images');
    if (selectedAudio) updateDailyUsage('voice');

    if (input) input.value = '';
    clearMedia();
    isChatSending = true;
    isTyping = true;
    renderView();

    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.reply) {
            chatMessages.push({ role: 'ai', content: data.reply });
        } else {
            chatMessages.push({ role: 'ai', content: 'عذراً، حدث خطأ ما. حاول مرة أخرى.' });
        }
    } catch (err) {
        chatMessages.push({ role: 'ai', content: 'عذراً، لا يمكنني الاتصال بالخادم حالياً.' });
    } finally {
        isChatSending = false;
        isTyping = false;
        renderView();
    }
}

// Games View
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
    const gameContainer = document.getElementById('main-content');
    gameContainer.innerHTML = `
        <div class="game-back-bar">
            <button class="game-back-btn" onclick="switchView('games')">
                <i class="fas fa-arrow-left"></i> Back to Games
            </button>
        </div>
        <iframe src="${gameFile}" class="game-iframe" style="width:100%; height:calc(100vh - 200px); border:none;" allowfullscreen></iframe>
    `;
}

function applyTheme() {
    const saved = localStorage.getItem('polyglots_theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);
}

init();
