// App State
let words = [];
let stories = [];
let quizzes = [];
let materials = [];
let currentUser = null;
let currentView = 'words';
let currentCategory = 'Alle';
let chatMessages = [];
let dailyChatLimit = 20;
let isTyping = false;
let isChatSending = false;
let translationMode = false;
let activeQuizIndex = -1;
let quizScore = 0;
let quizQuestions = [];
let quizAnswered = false;
let selectedAnswer = null;

// Initialize App
async function init() {
    await loadData();
    setupEventListeners();
    await checkRememberedUser();
}

async function loadData() {
    try {
        const [wordsRes, storiesRes, quizzesRes, materialsRes] = await Promise.all([
            fetch('words.json').then(r => r.json()),
            fetch('stories.json').then(r => r.json()),
            fetch('quizzes.json').then(r => r.json()),
            fetch('materials.json').then(r => r.json())
        ]);
        words = wordsRes;
        stories = storiesRes;
        quizzes = quizzesRes;
        materials = materialsRes;
        console.log('Data loaded:', { words: words.length, stories: stories.length, quizzes: quizzes.length, materials: materials.length });
    } catch (e) {
        console.error("Failed to load data", e);
    }
}

function setupEventListeners() {
    // Login
    document.getElementById('login-form').addEventListener('submit', handleLogin);

    // Nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => switchView(item.dataset.view));
    });

    // Search
    document.getElementById('searchInput').addEventListener('input', handleSearch);
}

// Auth Logic
async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const remember = document.getElementById('remember').checked;

    try {
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
        document.getElementById('login-error').innerText = 'Server error. Please try again.';
    }
}

async function checkRememberedUser() {
    const saved = localStorage.getItem('polyglots_user');
    if (saved) {
        const { username, password } = JSON.parse(saved);
        try {
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
    renderView();
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
    }
}

// View Renderers
function renderWordsView(container) {
    const searchInput = document.getElementById('searchInput');
    const search = searchInput ? searchInput.value.toLowerCase().trim() : '';
    
    // 1. If searching, show all matching words across all categories
    if (search.length > 0) {
        const filteredWords = words.filter(w => 
            w.word.toLowerCase().includes(search) || 
            w.ar.includes(search) ||
            w.cat.toLowerCase().includes(search)
        );
        
        renderWordCards(container, filteredWords, `نتائج البحث عن "${search}"`);
        return;
    }

    // 2. If no search and category is 'Alle', show category list
    if (currentCategory === 'Alle') {
        renderCategoryList(container);
    } else {
        // 3. Show words for selected category
        const filteredWords = words.filter(w => w.cat === currentCategory);
        renderWordCards(container, filteredWords, currentCategory, true);
    }
}

function renderCategoryList(container) {
    const categories = [...new Set(words.map(w => w.cat))];
    
    // Get an emoji for each category (first word's emoji)
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
    // Clear search when selecting a category to show its words
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    renderView();
}

function handleSearch() {
    if (currentView === 'words') renderView();
}

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

// Chat state persistence
function loadChatState() {
    try {
        const saved = localStorage.getItem('polyglots_chat_messages');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
                chatMessages = parsed;
            }
        }
    } catch(e) { console.error('Load chat state error:', e); }
}

function saveChatState() {
    try {
        localStorage.setItem('polyglots_chat_messages', JSON.stringify(chatMessages.slice(-50)));
    } catch(e) { console.error('Save chat state error:', e); }
}

loadChatState();
translationMode = localStorage.getItem('polyglots_translation_mode') === 'true';

function getChatData() {
    const today = new Date().toLocaleDateString();
    let chatData = { date: today, count: 0 };
    try {
        const saved = localStorage.getItem('polyglots_chat_v2');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && parsed.date === today) chatData = parsed;
        }
    } catch(e) {}
    return chatData;
}

function saveChatData(chatData) {
    localStorage.setItem('polyglots_chat_v2', JSON.stringify(chatData));
}

function renderChatView(container) {
    const chatData = getChatData();
    saveChatData(chatData);
    const isLimitReached = chatData.count >= dailyChatLimit;
    const botName = 'Polyglots Assistant';
    const modeLabel = translationMode ? '🔄 Translation Mode ON' : '🔄 Translation Mode';

    container.innerHTML = `
        <div class="chat-container-v2">
            <div class="chat-header-v2">
                <div class="chat-bot-avatar">
                    <span class="avatar-icon">🤖</span>
                </div>
                <div class="chat-bot-info-v2">
                    <h3>${botName}</h3>
                    <span class="online-status">● Online</span>
                </div>
                <div class="chat-header-actions">
                    <button class="chat-action-btn ${translationMode ? 'active-mode' : ''}" onclick="toggleTranslationMode()" title="${modeLabel}">
                        <i class="fas fa-language"></i>
                    </button>
                    <button class="chat-action-btn" onclick="clearChatHistory()" title="مسح المحادثة"><i class="fas fa-trash-alt"></i></button>
                </div>
            </div>
            ${translationMode ? '<div class="translation-mode-banner">🔄 Translation Mode: عربي ↔ Deutsch</div>' : ''}
            <div class="chat-messages-v2" id="chat-messages">
                ${chatMessages.map(m => `
                    <div class="message-bubble ${m.role}">
                        ${m.role === 'ai' ? '<div class="bot-avatar-small">🤖</div>' : ''}
                        <div class="bubble-content ${m.role}">
                            <div class="message-text">${m.content}</div>
                            <span class="message-time">${m.time || ''}</span>
                        </div>
                    </div>
                `).join('')}
                ${isTyping ? `
                    <div class="message-bubble ai">
                        <div class="bot-avatar-small">🤖</div>
                        <div class="bubble-content ai">
                            <div class="typing-indicator">
                                <span class="dot"></span>
                                <span class="dot"></span>
                                <span class="dot"></span>
                            </div>
                        </div>
                    </div>
                ` : ''}
            </div>
            <div class="chat-input-area-v2">
                <input type="text" id="chat-input" maxlength="200" placeholder="${isLimitReached ? 'Limit reached!' : 'اكتب بالعربي أو بالألماني...'}" ${isLimitReached ? 'disabled' : ''} ${isChatSending ? 'disabled' : ''}>
                <button class="send-btn" onclick="sendChatMessage()" ${isLimitReached || isChatSending ? 'disabled' : ''}>
                    ${isChatSending ? '<i class="fas fa-spinner fa-spin"></i>' : '<i class="fas fa-paper-plane"></i>'}
                </button>
            </div>
            <div class="chat-footer-bar">
                <div class="usage-bar">
                    <div class="usage-fill" style="width: ${(chatData.count / dailyChatLimit) * 100}%"></div>
                </div>
                <span class="usage-text">${chatData.count}/${dailyChatLimit} رسائل اليوم</span>
                ${isLimitReached ? '<span class="limit-text">لقد انتهيت من تدريبك اليومي! أراك غداً 🌟</span>' : ''}
            </div>
        </div>
    `;
    
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
        chatInput.focus();
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) sendChatMessage();
        });
    }
    
    const msgContainer = document.getElementById('chat-messages');
    if (msgContainer) {
        msgContainer.scrollTop = msgContainer.scrollHeight;
    }
}

function toggleTranslationMode() {
    translationMode = !translationMode;
    localStorage.setItem('polyglots_translation_mode', translationMode ? 'true' : 'false');
    if (translationMode) {
        chatMessages = [];
        saveChatState();
    }
    renderView();
}

function clearChatHistory() {
    if (confirm('هل تريد مسح المحادثة؟')) {
        chatMessages = [];
        saveChatState();
        renderView();
    }
}

function formatMessageTime() {
    const now = new Date();
    return now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
}

async function sendChatMessage() {
    if (isChatSending) return;
    
    const input = document.getElementById('chat-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    // Add user message with timestamp
    chatMessages.push({ role: 'user', content: text, time: formatMessageTime() });
    input.value = '';
    
    // Show typing indicator
    isTyping = true;
    isChatSending = true;
    renderView();

    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text, history: chatMessages.slice(-6), translationMode: translationMode })
        });
        
        if (!res.ok) {
            throw new Error(`Server responded with ${res.status}`);
        }
        
        const data = await res.json();
        
        if (data.reply) {
            chatMessages.push({ role: 'ai', content: data.reply, time: formatMessageTime() });
            
            // Update daily count safely
            const chatData = getChatData();
            chatData.count++;
            saveChatData(chatData);
        } else if (data.error) {
            chatMessages.push({ role: 'ai', content: '⚠️ ' + data.error, time: formatMessageTime() });
        } else {
            chatMessages.push({ role: 'ai', content: '⚠️ No response received. Please try again.', time: formatMessageTime() });
        }
    } catch (e) {
        chatMessages.push({ role: 'ai', content: '⚠️ Connection error. Please check your connection.', time: formatMessageTime() });
    }
    
    isTyping = false;
    isChatSending = false;
    saveChatState();
    renderView();
}

function playGerman(text) {
    if (!text) return;
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'de-DE';
        utterance.rate = 0.85;
        
        // Force German voice to prevent English accent on phones
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
            const germanVoice = voices.find(v => v.lang.startsWith('de')) || voices.find(v => v.lang.includes('de'));
            if (germanVoice) {
                utterance.voice = germanVoice;
            }
        }
        
        // If voices not loaded yet, wait for them
        if (voices.length === 0) {
            window.speechSynthesis.onvoiceschanged = function() {
                const updatedVoices = window.speechSynthesis.getVoices();
                const germanVoice = updatedVoices.find(v => v.lang.startsWith('de')) || updatedVoices.find(v => v.lang.includes('de'));
                if (germanVoice) utterance.voice = germanVoice;
                window.speechSynthesis.speak(utterance);
            };
        } else {
            window.speechSynthesis.speak(utterance);
        }
    } else {
        alert('Speech synthesis not supported in this browser.');
    }
}

function playWordAudio(wordId) {
    // Find the word in the words array
    const wordObj = words.find(w => w.id === wordId);
    if (!wordObj) return;
    
    // Try to play the generated MP3 file
    const audioPath = `audio/words/word_${wordId}.mp3`;
    const audio = new Audio(audioPath);
    
    audio.onerror = function() {
        // If MP3 not found, fallback to speechSynthesis
        console.log('MP3 not found for word ' + wordId + ', using speechSynthesis');
        playGerman(wordObj.art ? `${wordObj.art} ${wordObj.word}` : wordObj.word);
    };
    
    audio.play().catch(err => {
        console.log('Audio play error:', err);
        playGerman(wordObj.art ? `${wordObj.art} ${wordObj.word}` : wordObj.word);
    });
}

function stopSpeaking() {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
}

function toggleDarkMode() {
    const theme = document.documentElement.getAttribute('data-theme');
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('polyglots_theme', newTheme);
}

function applyTheme() {
    const saved = localStorage.getItem('polyglots_theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);
}

// Stories View - FIXED: uses 'text' field instead of 'content'
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
            <audio controls preload="none">
                <source src="${story.audio}" type="audio/mpeg">
                المتصفح لا يدعم مشغل الصوت.
            </audio>
        </div>
    ` : '';
    
    main.innerHTML = `
        <div class="story-full-view">
            <button class="back-btn" onclick="switchView('stories')"><i class="fas fa-arrow-left"></i> Back to Stories</button>
            <div class="story-header">
                <h2>${story.title}</h2>
            </div>
            ${audioPlayer}
            <div class="story-text-box">
                <p class="german-text">${story.text}</p>
                <hr>
                <p class="arabic-translation">${story.translation}</p>
            </div>
        </div>
    `;
    
    // Scroll to top
    main.scrollTop = 0;
}

// Quizzes View - FIXED: handles flat question structure
function renderQuizzesView(container) {
    if (quizzes.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:40px;"><p>No quizzes available.</p></div>`;
        return;
    }
    
    // Show quiz intro
    container.innerHTML = `
        <div class="quiz-intro">
            <h2>📝 Quizzes</h2>
            <p style="margin:20px 0; font-size:16px; color:#555;">Test your knowledge with ${quizzes.length} questions!</p>
            <button class="start-quiz-btn" onclick="startQuiz()">Start Quiz 🚀</button>
        </div>
    `;
}

function startQuiz() {
    activeQuizIndex = 0;
    quizScore = 0;
    quizAnswered = false;
    selectedAnswer = null;
    // Shuffle questions
    quizQuestions = [...quizzes].sort(() => Math.random() - 0.5);
    renderQuizQuestion();
}

function renderQuizQuestion() {
    const main = document.getElementById('main-content');
    
    if (activeQuizIndex >= quizQuestions.length) {
        // Quiz finished
        const percentage = Math.round((quizScore / quizQuestions.length) * 100);
        let emoji = percentage >= 80 ? '🏆' : percentage >= 60 ? '⭐' : '💪';
        main.innerHTML = `
            <div class="quiz-result">
                <h2>${emoji} Quiz Complete!</h2>
                <p class="result-score">${quizScore} / ${quizQuestions.length}</p>
                <p class="result-percent">${percentage}%</p>
                <button class="start-quiz-btn" onclick="startQuiz()">Try Again 🔄</button>
                <button class="back-btn" onclick="switchView('quizzes')" style="margin-top:10px;">Back to Quizzes</button>
            </div>
        `;
        return;
    }
    
    const q = quizQuestions[activeQuizIndex];
    
    // Build options HTML with correct/wrong coloring if already answered
    let optionsHtml = q.options.map((opt) => {
        let classes = 'quiz-option';
        if (quizAnswered) {
            classes += ' disabled';
            if (opt === q.answer) {
                classes += ' correct';
            } else if (opt === selectedAnswer && selectedAnswer !== q.answer) {
                classes += ' wrong';
            }
        }
        const escapedOpt = opt.replace(/'/g, "\\'");
        return `<button class="${classes}" onclick="answerQuiz('${escapedOpt}')">${opt}</button>`;
    }).join('');
    
    // Build feedback HTML
    let feedbackHtml = '';
    let nextBtnHtml = '';
    if (quizAnswered) {
        const isCorrect = selectedAnswer === q.answer;
        feedbackHtml = `<div class="quiz-answer-feedback ${isCorrect ? 'correct' : 'wrong'}">
            ${isCorrect ? '✅ إجابة صحيحة!' : '❌ إجابة خاطئة! الإجابة الصحيحة: ' + q.answer}
        </div>`;
        nextBtnHtml = `<div style="text-align:center;">
            <button class="next-btn" onclick="nextQuizQuestion()">Next ➡️</button>
        </div>`;
    }
    
    main.innerHTML = `
        <div class="quiz-question-view">
            <div class="quiz-progress">
                <span>Question ${activeQuizIndex + 1} / ${quizQuestions.length}</span>
                <span>Score: ${quizScore}</span>
            </div>
            <div class="quiz-question">
                <p>${q.question}</p>
            </div>
            <div class="quiz-options">
                ${optionsHtml}
            </div>
            ${feedbackHtml}
            ${nextBtnHtml}
        </div>
    `;
}

function answerQuiz(answer) {
    if (quizAnswered) return; // Prevent multiple clicks
    
    const q = quizQuestions[activeQuizIndex];
    selectedAnswer = answer;
    
    if (answer === q.answer) {
        quizScore++;
    }
    
    quizAnswered = true;
    renderQuizQuestion();
}

function nextQuizQuestion() {
    activeQuizIndex++;
    quizAnswered = false;
    selectedAnswer = null;
    renderQuizQuestion();
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
                        <p>Play against a friend! Answer questions in teams, earn points, and use jokers to win!</p>
                    </div>
                </div>
                <div class="game-card" onclick="openGame('derdiedas.html')">
                    <div class="game-card-icon">🎯</div>
                    <div class="game-card-info">
                        <h3>Der Die Das</h3>
                        <p>Catch falling words and choose the correct article before they disappear!</p>
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
        <iframe src="${gameFile}" class="game-iframe" allowfullscreen></iframe>
    `;
}

init();
