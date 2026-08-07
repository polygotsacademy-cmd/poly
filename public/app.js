// Global Cache for Mascots
window.mascotCache = {};

// Firebase Initialization
const firebaseConfig = {
  apiKey: "[AIzaSyAAhoeHyRF_X85YWEqDmyzjRJD9Yavh3bs]",
  authDomain: "poly-academy.firebaseapp.com",
  projectId: "poly-academy",
  storageBucket: "poly-academy.firebasestorage.app",
  messagingSenderId: "598496806275",
  appId: "1:598496806275:web:d237b5e03f890571ede2b6"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// App State
let words = [];
let stories = [];
let quizzes = [];

let messages = [];
let currentUser = null;
let currentView = 'words';
let currentCategory = 'Alle';
let chatMessages = [];
let isTyping = false;
let isChatSending = false;
let currentChatMode = 'translator'; // translator, teacher, homework, voice
let selectedImage = null;
let currentChatUser = null;
let chatUnsubscribe = null;
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
async function init( ) {
    await loadData();
    setupEventListeners();
    await checkRememberedUser();
    applyTheme();
}

async function loadData() {
    try {
        const [wordsRes, storiesRes, quizzesRes, messagesRes] = await Promise.all([
            fetch('words.json').then(r => r.json()),
            fetch('stories.json').then(r => r.json()),
            fetch('quizzes.json').then(r => r.json()),
            fetch('messages.json').then(r => r.json())
        ]);
        words = wordsRes;
        stories = storiesRes;
        quizzes = quizzesRes;
        messages = messagesRes;
        console.log('Data loaded:', { words: words.length, stories: stories.length, quizzes: quizzes.length, messages: messages.length });
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
            localStorage.setItem('polyglots_auth_data', JSON.stringify(data.user));
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
                localStorage.setItem('polyglots_auth_data', JSON.stringify(data.user));
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
    loadUserMascot();
    initGamification(); // Load Mascot on login
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
        case 'pronunciation': renderPronunciationView(main); break;
        case 'chat': renderChatView(main); break;
        case 'games': renderGamesView(main); break;
        case 'messages': renderMessagesView(main); break;
        case 'leaderboard': renderLeaderboardView(main); break;
    }
}

function renderMessagesView(container) {
    if (!currentUser) {
        container.innerHTML = '<div style="text-align:center; padding:40px;">Please login to see messages.</div>';
        return;
    }

    const authData = JSON.parse(localStorage.getItem('polyglots_auth_data') || '{}');
    const isAdmin = authData.isAdmin || false;
    const studentsList = authData.studentsList || [];

    let contacts = [];
    if (!isAdmin) {
        contacts = [
            { name: "Polyglots Academy", username: "يوسف" },
            { name: "Frau Hadeel", username: "فراو" },
            { name: "Assistant", username: "frau_farida" }
        ];
    } else {
        contacts = studentsList.map(s => ({ name: s, username: s }));
    }

    const html = `
        <div class="view-header" style="padding: 10px 20px; text-align: right;">
            <h2 style="color: var(--burgundy-color); font-family: 'Cairo', sans-serif;"><i class="fas fa-envelope"></i> الرسائل المباشرة</h2>
        </div>
        <div class="chat-split-container">
            <div class="contacts-list">
                ${contacts.map(c => `
                    <div class="contact-item ${currentChatUser === c.username ? 'active' : ''}" onclick="selectChat('${c.username}')">
                        <div class="contact-avatar" id="avatar-${c.username}">${window.mascotCache[c.username] || c.name.charAt(0).toUpperCase()}</div>
                        <div class="contact-info">
                            <h4>${c.name}</h4>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="chat-window" id="chat-window">
                ${currentChatUser ? renderChatWindow(currentChatUser) : `
                    <div class="no-chat-selected">
                        <i class="fas fa-comments"></i>
                        <p>Select a contact to start messaging</p>
                    </div>
                `}
            </div>
        </div>
    `;
    container.innerHTML = html;
    
    if (currentChatUser) {
        startChatListener();
    }

    if (isAdmin) {
        loadAdminMascots(studentsList);
    }

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

    // Award 3 points for listening to a word (tracked in sessionStorage to avoid spamming the same word)
    const listenedKey = `listened_word_${wordId}`;
    if (!sessionStorage.getItem(listenedKey)) {
        sessionStorage.setItem(listenedKey, 'true');
        awardPoints(3, 'استماع لكلمة');
    }
}

function playSFX(url) {
    const audio = new Audio(url);
    audio.play().catch(e => console.log("SFX play error", e));
}

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

    // Award 10 points for reading/listening to a story (tracked in sessionStorage)
    const storyKey = `read_story_${story.id}`;
    if (!sessionStorage.getItem(storyKey)) {
        sessionStorage.setItem(storyKey, 'true');
        awardPoints(10, 'قراءة قصة');
    }
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

    // Award 8 points if score > 70% (tracked per quiz category/mode session)
    const quizKey = `quiz_reward_${selectedQuizCategory}_${selectedQuizMode}`;
    if (percentage > 70 && !sessionStorage.getItem(quizKey)) {
        sessionStorage.setItem(quizKey, 'true');
        awardPoints(8, 'اجتياز اختبار (>70%)');
    }

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

function getDailyUsage() {
    const today = new Date().toISOString().split('T')[0];
    const usage = JSON.parse(localStorage.getItem('polyglots_usage') || '{}');
    if (usage.date !== today) {
        return { date: today, images: 0, voice: 0, text: 0 };
    }
    if (usage.text === undefined) usage.text = 0;
    return usage;
}

function updateDailyUsage(type) {
    const usage = getDailyUsage();
    usage[type]++;
    localStorage.setItem('polyglots_usage', JSON.stringify(usage));
}

function showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        setTimeout(() => toast.remove(), 500);
    }, 2500);
}

function renderChatView(container) {
    const usage = getDailyUsage();
    const gliderPos = {
        'translator': '0%',
        'teacher': '100%',
        'homework': '200%',
        'voice': '300%'
    }[currentChatMode];

    const username = currentUser && currentUser.username ? currentUser.username : 'بطل الأكاديمية';
    const userMascot = window.mascotCache && window.mascotCache[username] ? window.mascotCache[username] : '👤';

    container.innerHTML = `
        <div class="claude-chat-container">
            <div class="claude-header">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 36px; height: 36px; background: #d97706; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: bold;">AI</div>
                    <div>
                        <h2 style="margin: 0; font-size: 16px; font-family: 'Cairo', sans-serif; color: #2d3748;">Polyglots AI</h2>
                        <span style="font-size: 12px; color: #718096; font-family: 'Cairo', sans-serif;">مساعدك الذكي لتعلم الألمانية</span>
                    </div>
                </div>
            </div>



            <div class="claude-messages-area" id="chat-messages">
                ${chatMessages.length === 0 ? `
                    <div style="text-align: center; color: #a0aec0; margin: auto; font-family: 'Cairo', sans-serif; font-size: 14px;">
                        <i class="fas fa-robot" style="font-size: 32px; margin-bottom: 8px; color: #cbd5e0;"></i>
                        <p>ابدأ المحادثة الآن...</p>
                    </div>
                ` : chatMessages.map(msg => `
                    <div class="claude-msg ${msg.role}">
                        <div class="claude-msg-avatar">
                            ${msg.role === 'user' ? userMascot : 'AI'}
                        </div>
                        <div class="claude-msg-body">
                            ${msg.image ? `<img src="${msg.image}" style="max-width: 100%; border-radius: 8px; margin-bottom: 8px;">` : ''}
                            ${msg.audio ? `<audio controls src="${msg.audio}" style="width: 100%; margin-bottom: 8px;"></audio>` : ''}
                            <div style="white-space: pre-wrap; font-family: 'Cairo', sans-serif; line-height: 1.7;">${msg.content}</div>
                            ${msg.role === 'ai' && currentChatMode === 'translator' ? `
                                <div style="margin-top: 10px; display: flex; justify-content: flex-end;">
                                    <button onclick="playGerman(\`${msg.content.replace(/`/g, '\`')}\`)" style="background: #f7fafc; border: 1px solid #e2e8f0; color: #4a5568; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 5px; font-family: 'Cairo', sans-serif;" title="استمع للنطق">
                                        <i class="fas fa-volume-up"></i> استمع
                                    </button>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `).join('')}
                ${isTyping ? `
                    <div class="claude-msg ai">
                        <div class="claude-msg-avatar">AI</div>
                        <div class="claude-msg-body" style="padding: 12px 18px;">
                            <div style="display: flex; gap: 6px; align-items: center;">
                                <span style="width: 7px; height: 7px; background: #a0aec0; border-radius: 50%; animation: bounce 1.4s infinite ease-in-out both; animation-delay: -0.32s;"></span>
                                <span style="width: 7px; height: 7px; background: #a0aec0; border-radius: 50%; animation: bounce 1.4s infinite ease-in-out both; animation-delay: -0.16s;"></span>
                                <span style="width: 7px; height: 7px; background: #a0aec0; border-radius: 50%; animation: bounce 1.4s infinite ease-in-out both;"></span>
                            </div>
                        </div>
                    </div>
                ` : ''}
            </div>

            <div id="media-preview" class="media-preview"></div>

            <div class="chat-input-poly">
                <div class="input-wrapper" style="position: relative;">
                    <div class="mode-dropdown-container" style="position: relative; display: inline-block;">
                        <button type="button" onclick="event.stopPropagation(); toggleModeDropdown();" class="mode-chip-btn" style="background: #edf2f7; border: none; padding: 6px 12px; border-radius: 20px; font-size: 13px; font-family: 'Cairo', sans-serif; font-weight: bold; color: #2d3748; cursor: pointer; display: flex; align-items: center; gap: 6px;">
                            <i class="fas ${currentChatMode === 'translator' ? 'fa-language' : 'fa-chalkboard-teacher'}" style="color: #d97706;"></i>
                            <span>${currentChatMode === 'translator' ? 'مترجم' : 'مدرس'}</span>
                            <i class="fas fa-chevron-down" style="font-size: 10px; color: #718096;"></i>
                        </button>
                        <div id="mode-dropdown-menu" style="display: none; position: absolute; bottom: 100%; right: 0; margin-bottom: 8px; background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.12); border: 1px solid #e2e8f0; width: 140px; z-index: 1000; overflow: hidden;">
                            <div onclick="setChatMode('translator'); toggleModeDropdown();" style="padding: 10px 14px; display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-family: 'Cairo', sans-serif; background: ${currentChatMode === 'translator' ? '#fff5f5' : 'white'}; color: ${currentChatMode === 'translator' ? '#800020' : '#2d3748'}; font-weight: ${currentChatMode === 'translator' ? 'bold' : 'normal'};">
                                <i class="fas fa-language"></i> مترجم
                            </div>
                            <div onclick="setChatMode('teacher'); toggleModeDropdown();" style="padding: 10px 14px; display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-family: 'Cairo', sans-serif; background: ${currentChatMode === 'teacher' ? '#fff5f5' : 'white'}; color: ${currentChatMode === 'teacher' ? '#800020' : '#2d3748'}; font-weight: ${currentChatMode === 'teacher' ? 'bold' : 'normal'};">
                                <i class="fas fa-chalkboard-teacher"></i> مدرس
                            </div>
                        </div>
                    </div>
                    <button class="icon-btn" onclick="triggerImageUpload()"><i class="fas fa-camera"></i></button>
                    <button class="icon-btn" id="mic-btn" onclick="toggleVoiceRecording()"><i class="fas fa-microphone"></i></button>
                    <input type="text" id="chat-input" placeholder="اكتب هنا..." onkeypress="if(event.key === 'Enter') sendMessage()">
                    <button class="send-btn-poly" onclick="sendMessage()"><i class="fas fa-paper-plane"></i></button>
                </div>
                <div class="chat-counters">
                    <span class="counter-item">الرسائل: ${usage.text}/20</span>
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
    if (currentChatMode !== mode) {
        currentChatMode = mode;
        chatMessages = []; // Clear chat messages for clean slate on mode change
        renderView();
    }
}

function triggerImageUpload() {
    const usage = getDailyUsage();
    if (usage.images >= 3) {
        showToast("يا بطل، أنت خلصت الـ 3 صور بتوع النهاردة! استنى لبكرة بقى. 😊");
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
        showToast("يا بطل، أنت خلصت الـ 3 تسجيلات بتوع النهاردة! استنى لبكرة بقى. 😊");
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
            const duration = recordingTime;
            const reader = new FileReader();
            reader.onload = (e) => {
                selectedAudio = { data: e.target.result, duration: duration };
                showMediaPreview('audio', selectedAudio.data);
            };
            reader.readAsDataURL(audioBlob);
            stream.getTracks().forEach(track => track.stop());
            const input = document.getElementById('chat-input');
            if (input) input.placeholder = "اكتب هنا...";
        };

        mediaRecorder.start();
        micBtn.classList.add('recording-active');
        showToast("🎙️ جاري التسجيل... (أقصى مدة 30 ثانية)");
        
        recordingInterval = setInterval(() => {
            recordingTime++;
            const input = document.getElementById('chat-input');
            if (input) input.placeholder = `جاري التسجيل (${recordingTime} ثانية)...`;
            if (recordingTime >= 30) {
                toggleVoiceRecording();
            }
        }, 1000);

    } catch (err) {
        showToast("لازم تدينا إذن المايك عشان تقدر تسجل صوتك!");
    }
}

async function sendMessage() {
    const input = document.getElementById('chat-input');
    const text = input ? input.value.trim() : '';
    if ((!text && !selectedImage && !selectedAudio) || isChatSending) return;

    const usage = getDailyUsage();
    if (usage.text >= 20) {
        showToast("يا بطل، أنت خلصت الـ 20 رسالة بتوع النهاردة! استنى لبكرة بقى. 😊");
        return;
    }

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

    updateDailyUsage('text');
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
// Real-time Messaging Functions
function selectChat(username) {
    currentChatUser = username;
    renderView();
}

function renderChatWindow(targetUser) {
    const authData = JSON.parse(localStorage.getItem('polyglots_auth_data') || '{}');
    const isAdmin = authData.isAdmin || false;
    let displayName = targetUser;

    if (!isAdmin) {
        const studentContacts = [
            { name: "Polyglots Academy", username: "يوسف" },
            { name: "Frau Hadeel", username: "فراو" },
            { name: "Assistant", username: "frau_farida" }
        ];
        const contact = studentContacts.find(c => c.username === targetUser);
        if (contact) displayName = contact.name;
    }

    const limits = getMediaLimits();
    return `
        <div class="chat-header">
            <div class="contact-avatar">${window.mascotCache[targetUser] || displayName.charAt(0).toUpperCase()}</div>
            <div class="contact-info">
                <h4>${displayName}</h4>
            </div>
            <div class="chat-header-actions">
                <button class="header-btn" onclick="toggleFullscreen()" title="Fullscreen">
                    <i class="fas fa-expand"></i>
                </button>
            </div>
        </div>
        <div class="chat-messages-area" id="chat-messages-area">
            <div style="text-align:center; padding:20px; color:#666;">Loading messages...</div>
        </div>
        <div class="media-counters">
            <span>الصور: ${limits.images}/6</span>
            <span>الصوت: ${limits.audio}/6</span>
        </div>
        <div class="chat-input-container">
            <button class="media-btn" onclick="triggerImageUpload()">
                <i class="fas fa-camera"></i>
            </button>
            <button id="voice-record-btn" class="media-btn" onclick="toggleChatVoiceRecording()">
                <i class="fas fa-microphone"></i>
            </button>
            <span id="record-timer" style="display:none; color:red; font-weight:bold; margin: 0 10px;">00:00</span>
            <input type="file" id="chat-image-upload" accept="image/*" style="display: none;" onchange="handleImageSelection(this)">
            <input type="text" id="chat-msg-input" placeholder="Type a message..." onkeypress="if(event.key === 'Enter') sendChatMessage()">
            <button class="chat-send-btn" onclick="sendChatMessage()">
                <i class="fas fa-paper-plane"></i>
            </button>
        </div>
    `;
}

function getMediaLimits() {
    if (!currentUser) return { images: 0, audio: 0 };
    const date = new Date().toISOString().split('T')[0];
    const key = `chat_media_limits_${currentUser.username}_${date}`;
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : { images: 0, audio: 0 };
}

function checkMediaLimit(type) {
    const limits = getMediaLimits();
    if (type === 'image' && limits.images >= 6) {
        alert("لقد وصلت للحد الأقصى للصور اليوم (6 صور).");
        return false;
    }
    if (type === 'audio' && limits.audio >= 6) {
        alert("لقد وصلت للحد الأقصى للرسائل الصوتية اليوم (6 رسائل).");
        return false;
    }
    return true;
}

function incrementMediaLimit(type) {
    if (!currentUser) return;
    const date = new Date().toISOString().split('T')[0];
    const key = `chat_media_limits_${currentUser.username}_${date}`;
    const limits = getMediaLimits();
    if (type === 'image') limits.images++;
    if (type === 'audio') limits.audio++;
    localStorage.setItem(key, JSON.stringify(limits));
    renderView();
}

function getChatId(user1, user2) {
    return [user1, user2].sort().join('_');
}

function startChatListener() {
    if (chatUnsubscribe) {
        chatUnsubscribe();
    }

    if (!currentUser || !currentChatUser) return;

    const chatId = getChatId(currentUser.username, currentChatUser);
    
    chatUnsubscribe = db.collection('messages')
        .where('chatId', '==', chatId)
        .onSnapshot((snapshot) => {
            const messagesArea = document.getElementById('chat-messages-area');
            if (!messagesArea) return;

            if (snapshot.empty) {
                messagesArea.innerHTML = '<div style="text-align:center; padding:20px; color:#666;">No messages yet. Say hi!</div>';
                return;
            }

            const messagesArray = [];
            snapshot.forEach(doc => {
                messagesArray.push({ id: doc.id, ...doc.data() });
            });
            messagesArray.sort((a, b) => (a.timestamp?.toMillis() || 0) - (b.timestamp?.toMillis() || 0));

            let html = '';
            let unreadDocsToUpdate = []; // تجميع الرسائل غير المقروءة لتحديثها

            messagesArray.forEach((msg) => {
                if (msg.deletedFor && msg.deletedFor.includes(currentUser.username)) {
                    return;
                }

                const isSent = msg.sender === currentUser.username;
                
                // إذا كانت الرسالة مبعوثة لي ولم أقرأها بعد، أضفها لقائمة التحديث
                if (!isSent && msg.isRead === false) {
                    unreadDocsToUpdate.push(msg.id);
                }

                const time = msg.timestamp ? new Date(msg.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...';
                
                let contentHtml = '';
                if (msg.isDeletedForEveryone) {
                    contentHtml = `<span class="deleted-placeholder"><i class="fas fa-ban"></i> تم مسح هذه الرسالة</span>`;
                } else if (msg.type === 'image') {
                    contentHtml = `<img src="${msg.mediaData}" onclick="openLightbox('${msg.mediaData}')">`;
                } else if (msg.type === 'audio') {
                    contentHtml = `<audio controls src="${msg.mediaData}"></audio>`;
                } else {
                    contentHtml = formatTextWithLinks(msg.text || '');
                }

                const deleteBtn = !msg.isDeletedForEveryone ? `
                    <div class="delete-msg-btn" onclick="deleteMessagePrompt('${msg.id}', ${isSent})">
                        <i class="fas fa-trash"></i>
                    </div>
                ` : '';

                // إضافة علامات الصح (Read Receipts)
                let ticksHtml = '';
                if (isSent && !msg.isDeletedForEveryone) {
                    if (msg.isRead) {
                        ticksHtml = `<span style="color: #34b7f1; margin-left: 5px; font-size: 12px;">✓✓</span>`; // صحين باللون الأزرق
                    } else {
                        ticksHtml = `<span style="color: #999; margin-left: 5px; font-size: 12px;">✓</span>`; // صح واحدة رمادي
                    }
                }

                html += `
                    <div class="chat-msg ${isSent ? 'sent' : 'received'}" data-id="${msg.id}">
                        ${deleteBtn}
                        ${contentHtml}
                        <span class="time">${time}${ticksHtml}</span>
                    </div>
                `;
            });
            
            messagesArea.innerHTML = html;
            messagesArea.scrollTop = messagesArea.scrollHeight;

            // تحديث حالة الرسائل إلى "مقروءة" في قاعدة البيانات
            if (unreadDocsToUpdate.length > 0) {
                const batch = db.batch();
                unreadDocsToUpdate.forEach(docId => {
                    const docRef = db.collection('messages').doc(docId);
                    batch.update(docRef, { isRead: true });
                });
                batch.commit().catch(err => console.error("Error updating read status:", err));
            }

        }, (error) => {
            console.error("Error fetching messages: ", error);
            const messagesArea = document.getElementById('chat-messages-area');
            if (messagesArea) {
                messagesArea.innerHTML = '<div style="text-align:center; padding:20px; color:red;">Error loading messages.</div>';
            }
        });
}
async function sendChatMessage() {
    const input = document.getElementById('chat-msg-input');
    const text = input.value.trim();
    
    if (!text || !currentUser || !currentChatUser) return;

    const chatId = getChatId(currentUser.username, currentChatUser);
    
    input.disabled = true;

    try {
        await db.collection('messages').add({
            chatId: chatId,
            sender: currentUser.username,
            receiver: currentChatUser,
            text: text,
            isRead: false, // تمت إضافة حالة القراءة
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        input.value = '';
    } catch (error) {
        console.error("Firestore Send Error:", error);
        alert("Error sending message: " + error.message);
    } finally {
        input.disabled = false;
        input.focus();
    }
}
// Image Upload Logic
function handleImageSelection(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            // Compress Image using Canvas
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            
            const maxDimension = 800;
            if (width > height) {
                if (width > maxDimension) {
                    height *= maxDimension / width;
                    width = maxDimension;
                }
            } else {
                if (height > maxDimension) {
                    width *= maxDimension / height;
                    height = maxDimension;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            const base64String = canvas.toDataURL('image/jpeg', 0.6);
            sendMediaMessage('image', base64String);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
    
    // Reset input
    input.value = '';
}

async function sendMediaMessage(type, data) {
    if (!currentUser || !currentChatUser) return;
    const chatId = getChatId(currentUser.username, currentChatUser);

    try {
        await db.collection('messages').add({
            chatId: chatId,
            sender: currentUser.username,
            receiver: currentChatUser,
            type: type,
            mediaData: data,
            isRead: false, // تمت إضافة حالة القراءة
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        incrementMediaLimit(type);
    } catch (error) {
        console.error("Error sending media: ", error);
        alert("Failed to send media. Document might be too large.");
    }
}
// Voice Recording Logic
let chatMediaRecorder = null;
let chatAudioChunks = [];
let chatRecordingInterval = null;
let chatRecordingTime = 0;

async function toggleChatVoiceRecording() {
    if (chatMediaRecorder && chatMediaRecorder.state === "recording") {
        stopChatVoiceRecording();
    } else {
        if (!checkMediaLimit('audio')) return;
        startChatVoiceRecording();
    }
}

async function startChatVoiceRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        chatMediaRecorder = new MediaRecorder(stream);
        chatAudioChunks = [];
        chatRecordingTime = 0;

        chatMediaRecorder.ondataavailable = (e) => {
            chatAudioChunks.push(e.data);
        };

        chatMediaRecorder.onstop = async () => {
            const audioBlob = new Blob(chatAudioChunks, { type: 'audio/webm' });
            const reader = new FileReader();
            reader.onloadend = () => {
                sendMediaMessage('audio', reader.result);
            };
            reader.readAsDataURL(audioBlob);
            
            // Stop all tracks
            stream.getTracks().forEach(track => track.stop());
        };

        chatMediaRecorder.start();
        
        // UI Update
        const btn = document.getElementById('voice-record-btn');
        const timerSpan = document.getElementById('record-timer');
        if (btn) {
            btn.classList.add('recording');
            btn.innerHTML = '<i class="fas fa-stop"></i>';
        }
        if (timerSpan) {
            timerSpan.style.display = 'inline';
            timerSpan.innerText = '00:00';
        }

        // Timer Interval & 200s Limit
        chatRecordingInterval = setInterval(() => {
            chatRecordingTime++;
            const mins = Math.floor(chatRecordingTime / 60).toString().padStart(2, '0');
            const secs = (chatRecordingTime % 60).toString().padStart(2, '0');
            if (timerSpan) timerSpan.innerText = `${mins}:${secs}`;
            
            if (chatRecordingTime >= 200) {
                stopChatVoiceRecording();
            }
        }, 1000);

    } catch (err) {
        console.error("Mic access denied: ", err);
        alert("يرجى السماح بالوصول للميكروفون لتسجيل الصوت.");
    }
}

function stopChatVoiceRecording() {
    if (chatMediaRecorder) {
        chatMediaRecorder.stop();
        clearInterval(chatRecordingInterval);
        
        // UI Update
        const btn = document.getElementById('voice-record-btn');
        const timerSpan = document.getElementById('record-timer');
        if (btn) {
            btn.classList.remove('recording');
            btn.innerHTML = '<i class="fas fa-microphone"></i>';
        }
        if (timerSpan) {
            timerSpan.style.display = 'none';
        }
    }
}

// --- UI Enhancement Functions ---

function toggleFullscreen() {
    const chatWin = document.querySelector('.chat-window');
    if (chatWin) {
        chatWin.classList.toggle('chat-fullscreen');
        const icon = chatWin.querySelector('.header-btn i');
        if (icon) {
            if (chatWin.classList.contains('chat-fullscreen')) {
                icon.className = 'fas fa-compress';
            } else {
                icon.className = 'fas fa-expand';
            }
        }
    }
}

function openLightbox(src) {
    const modal = document.getElementById('image-lightbox');
    const img = document.getElementById('lightbox-img');
    if (modal && img) {
        modal.style.display = "block";
        img.src = src;
    }
}

function closeLightbox() {
    const modal = document.getElementById('image-lightbox');
    if (modal) modal.style.display = "none";
}

function openDriveModal(url) {
    const modal = document.getElementById('drive-modal');
    const iframe = document.getElementById('drive-iframe');
    if (modal && iframe) {
        // Extract file ID and create preview URL
        const match = url.match(/\/file\/d\/(.+?)\//);
        if (match && match[1]) {
            const fileId = match[1];
            iframe.src = `https://drive.google.com/file/d/${fileId}/preview`;
            modal.style.display = "block";
        } else {
            window.open(url, '_blank' );
        }
    }
}

function closeDriveModal() {
    const modal = document.getElementById('drive-modal');
    const iframe = document.getElementById('drive-iframe');
    if (modal && iframe) {
        modal.style.display = "none";
        iframe.src = "";
    }
}

function formatTextWithLinks(text) {
    if (!text) return '';
    const urlRegex = /(https?:\/\/[^\s]+ )/g;
    return text.replace(urlRegex, (url) => {
        if (url.includes('drive.google.com/file/d/')) {
            return `<a href="javascript:void(0)" onclick="openDriveModal('${url}')" class="chat-link">${url}</a>`;
        }
        return `<a href="${url}" target="_blank" class="chat-link">${url}</a>`;
    });
}

// --- Delete Message Logic ---

let currentDeleteMsgId = null;

function deleteMessagePrompt(docId, isSent) {
    currentDeleteMsgId = docId;
    const modal = document.getElementById('delete-modal');
    const everyoneBtn = document.getElementById('delete-everyone-btn');
    
    if (modal && everyoneBtn) {
        modal.style.display = "block";
        everyoneBtn.style.display = isSent ? "block" : "none";
    }
}

function closeDeleteModal() {
    const modal = document.getElementById('delete-modal');
    if (modal) modal.style.display = "none";
    currentDeleteMsgId = null;
}

async function confirmDelete(type) {
    if (!currentDeleteMsgId || !currentUser) return;
    
    try {
        const docRef = db.collection('messages').doc(currentDeleteMsgId);
        
        if (type === 'everyone') {
            await docRef.update({
                isDeletedForEveryone: true,
                text: '🚫 تم مسح هذه الرسالة',
                mediaData: null,
                type: 'text'
            });
        } else if (type === 'me') {
            await docRef.update({
                deletedFor: firebase.firestore.FieldValue.arrayUnion(currentUser.username)
            });
        }
        
        closeDeleteModal();
    } catch (error) {
        console.error("Delete error:", error);
        alert("Failed to delete message.");
    }
}

// --- MASCOT LOGIC ---
const emojis = ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🐛','🦋'];

function openMascotModal() {
    const modal = document.getElementById('mascot-modal');
    const grid = document.getElementById('mascot-grid');
    if (modal && grid) {
        if (grid.innerHTML === '') {
            emojis.forEach(emoji => {
                let btn = document.createElement('div');
                btn.className = 'mascot-btn';
                btn.innerText = emoji;
                btn.onclick = () => selectMascot(emoji);
                grid.appendChild(btn);
            });
        }
        modal.style.display = 'block';
    }
}

function closeMascotModal() {
    const modal = document.getElementById('mascot-modal');
    if (modal) modal.style.display = 'none';
}

function selectMascot(emoji) {
    const mascotSpan = document.getElementById('user-mascot');
    if (mascotSpan) mascotSpan.innerText = emoji;
    closeMascotModal();
    
    if (currentUser && currentUser.username) {
        db.collection('users').doc(currentUser.username).set({ mascot: emoji }, { merge: true })
        .catch(err => console.error("Error saving mascot:", err));
    }
}

function loadUserMascot() {
    if (currentUser && currentUser.username) {
        db.collection('users').doc(currentUser.username).get().then(doc => {
            if (doc.exists && doc.data().mascot) {
                const mascotSpan = document.getElementById('user-mascot');
                if (mascotSpan) mascotSpan.innerText = doc.data().mascot;
            }
        }).catch(err => console.error("Error loading mascot:", err));
    }
}

function loadAdminMascots(studentsList) {
    if (!studentsList || studentsList.length === 0) return;
    
    studentsList.forEach(student => {
        db.collection('users').doc(student).get().then(doc => {
            if (doc.exists && doc.data().mascot) {
                window.mascotCache[student] = doc.data().mascot;
                const avatarEl = document.getElementById(`avatar-${student}`);
                if (avatarEl) {
                    avatarEl.innerText = doc.data().mascot;
                }
            }
        }).catch(err => console.error("Error loading student mascot:", err));
    });
}

// --- GAMIFICATION SYSTEM ---
let userPoints = 0;
let userStreak = 0;

async function initGamification() {
    if (!currentUser || !currentUser.username) return;
    const userRef = db.collection('users').doc(currentUser.username);
    try {
        const doc = await userRef.get();
        const today = new Date().toISOString().split('T')[0];
        
        let points = 0;
        let streak = 1;
        let lastLogin = '';
        
        if (doc.exists) {
            const data = doc.data();
            points = data.points || 0;
            streak = data.streak || 1;
            lastLogin = data.lastLoginDate || '';
        }
        
        // Daily login streak & bonus
        if (lastLogin !== today) {
            const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
            if (lastLogin === yesterday) {
                streak += 1;
            } else if (lastLogin !== '') {
                streak = 1;
            }
            points += 10; // Daily login bonus XP
            showToast('🎉 مكافأة الدخول اليومي: +10 نقاط! (Streak: ' + streak + ' أيام)', 'success');
            
            await userRef.set({
                points: points,
                streak: streak,
                lastLoginDate: today
            }, { merge: true });
        }
        
        userPoints = points;
        userStreak = streak;
        updatePointsUI();
    } catch (err) {
        console.error("Error initializing gamification:", err);
    }
}

function updatePointsUI() {
    const valEl = document.getElementById('user-points-val');
    if (valEl) {
        valEl.innerText = userPoints;
    }
}

async function awardPoints(pointsToAdd, reason = '') {
    if (!currentUser || !currentUser.username) return;
    userPoints += pointsToAdd;
    updatePointsUI();
    
    if (reason) {
        showToast(`⭐ +${pointsToAdd} XP (${reason})`, 'success');
    }
    
    try {
        await db.collection('users').doc(currentUser.username).set({
            points: userPoints
        }, { merge: true });
    } catch (err) {
        console.error("Error saving points:", err);
    }
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.style.cssText = 'background: #333; color: #fff; padding: 12px 20px; margin-top: 10px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); font-family: "Cairo", sans-serif; font-size: 14px; animation: fadeIn 0.3s ease;';
    toast.innerText = message;
    
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

async function renderLeaderboardView(container) {
    container.innerHTML = `
        <div class="view-header" style="padding: 20px; text-align: center;">
            <h2 style="color: var(--burgundy-color, #800020); font-family: 'Cairo', sans-serif;"><i class="fas fa-trophy" style="color: #f1c40f;"></i> لوحة الشرف وأبطال الأكاديمية</h2>
            <p style="color: #666; margin-top: 5px;">تنافس مع زملائك واجمع النقاط لتتصدر القائمة!</p>
        </div>
        <div style="max-width: 600px; margin: 0 auto; padding: 0 20px 40px 20px;">
            <div id="leaderboard-list" style="background: white; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); overflow: hidden; border: 1px solid #eee;">
                <div style="text-align: center; padding: 30px; color: #888;">جاري تحميل لوحة الشرف... ⏳</div>
            </div>
        </div>
    `;
    
    try {
        const snap = await db.collection('users').orderBy('points', 'desc').limit(20).get();
        const listEl = document.getElementById('leaderboard-list');
        if (!listEl) return;
        
        if (snap.empty) {
            listEl.innerHTML = '<div style="text-align: center; padding: 30px; color: #888;">لا توجد بيانات حالياً</div>';
            return;
        }
        
        let html = '';
        let rank = 1;
        snap.forEach(doc => {
            const data = doc.data();
            const username = doc.id;
            const points = data.points || 0;
            const mascot = data.mascot || '👤';
            
            let rankBadgeStyle = 'background: #f0f0f0; color: #333;';
            if (rank === 1) rankBadgeStyle = 'background: #f1c40f; color: #fff; font-weight: bold;';
            else if (rank === 2) rankBadgeStyle = 'background: #bdc3c7; color: #fff; font-weight: bold;';
            else if (rank === 3) rankBadgeStyle = 'background: #e67e22; color: #fff; font-weight: bold;';
            
            const isCurrent = currentUser && currentUser.username === username;
            
            html += `
                <div style="display: flex; align-items: center; padding: 15px 20px; border-bottom: 1px solid #f5f5f5; ${isCurrent ? 'background: #fffdf0;' : ''}">
                    <div style="width: 35px; height: 35px; border-radius: 50%; display: flex; align-items: center; justify-content: center; ${rankBadgeStyle} margin-left: 15px; font-size: 14px;">
                        ${rank}
                    </div>
                    <div style="font-size: 26px; margin-left: 15px; width: 40px; text-align: center;">
                        ${mascot}
                    </div>
                    <div style="flex-grow: 1; font-family: 'Cairo', sans-serif;">
                        <h4 style="margin: 0; color: #333; font-size: 16px;">${username} ${isCurrent ? '<span style="font-size: 11px; background: var(--burgundy-color, #800020); color: white; padding: 2px 8px; border-radius: 10px; margin-right: 8px;">أنت</span>' : ''}</h4>
                    </div>
                    <div style="font-weight: bold; color: #e67e22; font-size: 16px; font-family: 'Nunito', sans-serif;">
                        ⭐ ${points} XP
                    </div>
                </div>
            `;
            rank++;
        });
        
        listEl.innerHTML = html;
    } catch (err) {
        console.error("Error loading leaderboard:", err);
        const listEl = document.getElementById('leaderboard-list');
        if (listEl) {
            listEl.innerHTML = '<div style="text-align: center; padding: 30px; color: red;">حدث خطأ أثناء تحميل لوحة الشرف</div>';
        }
    }
}
// --- END GAMIFICATION SYSTEM ---

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
