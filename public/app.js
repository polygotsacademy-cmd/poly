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
let dailyChatLimit = 20;
let maxCharLimit = 200;
let isTyping = false;
let isChatSending = false;
let currentChatMode = 'teacher'; // Default mode

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
    } catch (e) {
        console.error("Failed to load data", e);
    }
}

function setupEventListeners() {
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('sidebar-toggle').addEventListener('click', toggleSidebar);
    document.getElementById('sidebar-close').addEventListener('click', closeSidebar);
    document.getElementById('sidebar-overlay').addEventListener('click', closeSidebar);

    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            switchView(item.dataset.view);
            closeSidebar();
        });
    });

    document.getElementById('searchInput').addEventListener('input', handleSearch);
}

// Sidebar Logic
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebar-overlay').classList.toggle('active');
}

function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('active');
}

// Auth Logic
async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const remember = document.getElementById('remember').checked;

    if (username && password) {
        currentUser = { username: username };
        if (remember) {
            localStorage.setItem('polyglots_user', JSON.stringify({ username, password }));
        }
        localStorage.setItem('polyglots_username', username);
        showApp();
        switchView('words');
        window.scrollTo(0, 0);
    }
}

async function checkRememberedUser() {
    const saved = localStorage.getItem('polyglots_user');
    if (saved) {
        const { username, password } = JSON.parse(saved);
        currentUser = { username: username };
        localStorage.setItem('polyglots_username', username);
        showApp();
        switchView('words');
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
        case 'messages': renderMessagesView(main); break;
        case 'pronunciation': renderPronunciationView(main); break;
        case 'chat': renderChatView(main); break;
        case 'games': renderGamesView(main); break;
    }
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
            <h2 style="color: var(--burgundy-color); font-family: 'Cairo', sans-serif;"><i class="fas fa-th-large"></i> التصنيفات</h2>
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
            <h2 style="color: var(--burgundy-color); font-family: 'Cairo', sans-serif;">${title}</h2>
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

// Messages View
function renderMessagesView(container) {
    const username = localStorage.getItem('polyglots_username') || "guest";
    
    const filteredMessages = messages.filter(m => 
        m.isActive && (m.targetUsers.includes(username) || m.targetUsers.includes("all"))
    );

    container.innerHTML = `
        <div class="view-header" style="padding: 10px 20px; text-align: right;">
            <h2 style="color: var(--burgundy-color); font-family: 'Cairo', sans-serif;">📬 الرسائل</h2>
        </div>
        <div class="messages-container">
            ${filteredMessages.length > 0 ? filteredMessages.map(m => `
                <div class="message-card">
                    <div class="message-card-header">
                        <h3>${m.title}</h3>
                        <span class="message-date">${m.date}</span>
                    </div>
                    <div class="message-content">
                        ${m.content}
                    </div>
                </div>
            `).join('') : `
                <div class="empty-state" style="text-align:center; padding:40px; color:#888;">
                    <i class="fas fa-envelope-open" style="font-size: 40px; margin-bottom: 15px; opacity: 0.3;"></i>
                    <p style="font-family: 'Cairo', sans-serif; font-weight: bold;">لا يوجد رسائل</p>
                </div>
            `}
        </div>
    `;
}

// Materials View
function renderMaterialsView(container) {
    const groups = ["Alle", "Sa10:00", "Sa12:00", "Sa01:30", "De6:00"];
    let selectedGroup = localStorage.getItem('selected_group') || "Alle";

    const filterHtml = `<div class="materials-filter" style="display:flex; gap:10px; overflow-x:auto; padding-bottom:15px; margin-bottom:20px;">
        ${groups.map(g => `<button class="cat-btn ${selectedGroup === g ? 'active' : ''}" onclick="setMaterialGroup('${g}')">${g}</button>`).join('')}
    </div>`;

    const filtered = materials.filter(m => selectedGroup === 'Alle' || m.group === selectedGroup);

    const contentHtml = filtered.length > 0 
        ? filtered.map(m => `
            <div class="material-card" style="background:white; padding:20px; border-radius:15px; margin-bottom:15px; box-shadow:0 4px 15px rgba(0,0,0,0.05);">
                <span class="badge ${m.type}" style="background:#eee; padding:4px 10px; border-radius:10px; font-size:12px;">${m.type.toUpperCase()}</span>
                <h3 style="margin:10px 0;">${m.title}</h3>
                <p style="color:#666;">${m.description}</p>
                <div class="deadline" style="font-size:12px; color:#999; margin-top:10px;">Deadline: ${m.deadline}</div>
                ${m.link ? `<a href="${m.link}" target="_blank" class="material-btn" style="display:inline-block; margin-top:10px; color:var(--burgundy-color); font-weight:bold;">Open Link</a>` : ''}
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
            <h2 style="color: var(--burgundy-color); font-family: 'Cairo', sans-serif;">🗣️ German Pronunciation</h2>
            <p style="margin-bottom:15px; font-size:14px; color:#777;">Write any German word or sentence and listen to its pronunciation.</p>
            <textarea id="pronounce-text" placeholder="Type German words or sentences here..." style="width:100%; height:150px; padding:15px; border-radius:15px; border:2px solid #ddd; font-size:18px; outline:none;"></textarea>
            <div class="pronunciation-btns" style="display:flex; gap:15px; margin-top:15px;">
                <button class="listen-btn" onclick="playGerman(document.getElementById('pronounce-text').value)" style="flex:1; padding:15px; border-radius:10px; border:none; background:var(--burgundy-color); color:white; font-weight:bold; cursor:pointer;">Listen 🔊</button>
                <button class="clear-btn" onclick="document.getElementById('pronounce-text').value = ''" style="flex:1; padding:15px; border-radius:10px; border:none; background:#eee; font-weight:bold; cursor:pointer;">Clear 🗑️</button>
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

// Chat View Logic
function getDailyChatCount() {
    const today = new Date().toDateString();
    const data = JSON.parse(localStorage.getItem('chat_limit_data') || '{}');
    if (data.date !== today) {
        return 0;
    }
    return data.count || 0;
}

function incrementDailyChatCount() {
    const today = new Date().toDateString();
    const count = getDailyChatCount() + 1;
    localStorage.setItem('chat_limit_data', JSON.stringify({ date: today, count: count }));
    return count;
}

function renderChatView(container) {
    const modes = [
        { id: 'teacher', name: 'المعلم', icon: '👨‍🏫' },
        { id: 'translator', name: 'المترجم', icon: '🔄' }
    ];

    const currentCount = getDailyChatCount();

    container.innerHTML = `
        <div class="chat-container glass-style">
            <div class="chat-header-info">
                <div class="chat-usage-counter">
                    الرسائل اليومية: <span>${currentCount} / ${dailyChatLimit}</span>
                </div>
                <div class="chat-mode-selector">
                    ${modes.map(m => `
                        <button class="mode-btn ${currentChatMode === m.id ? 'active' : ''}" onclick="setChatMode('${m.id}')">
                            ${m.icon} ${m.name}
                        </button>
                    `).join('')}
                </div>
            </div>
            <div class="chat-messages" id="chat-messages">
                ${chatMessages.length === 0 ? `
                    <div class="message-row ai">
                        <div class="message-content">
                            <div class="message-avatar ai-avatar"><i class="fas fa-robot"></i></div>
                            <div class="message-text">أهلاً بك يا بطل! أنا مساعدك لتعلم الألمانية. اسألني أي حاجة في الألماني وهجاوبك بكل سهولة! 🇩🇪</div>
                        </div>
                    </div>
                ` : ''}
                ${chatMessages.map(m => `
                    <div class="message-row ${m.role}">
                        <div class="message-content">
                            <div class="message-avatar ${m.role === 'user' ? 'user-avatar' : 'ai-avatar'}">${m.role === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>'}</div>
                            <div class="message-text">${m.role === 'ai' ? marked.parse(m.content) : m.content}</div>
                        </div>
                    </div>
                `).join('')}
                ${isTyping ? `
                    <div class="message-row ai">
                        <div class="message-content">
                            <div class="message-avatar ai-avatar"><i class="fas fa-robot"></i></div>
                            <div class="message-text typing-indicator">بيفكر... 🧠</div>
                        </div>
                    </div>
                ` : ''}
            </div>
            <div class="chat-input-wrapper">
                <div class="chat-input-box">
                    <input type="text" id="chat-input" maxlength="200" placeholder="اكتب رسالتك هنا (بحد أقصى 200 حرف)..." onkeypress="if(event.key==='Enter') sendChatMessage()">
                    <div class="char-counter" id="char-counter">0 / 200</div>
                    <button onclick="sendChatMessage()" ${isChatSending || currentCount >= dailyChatLimit ? 'disabled' : ''}>
                        <i class="fas fa-paper-plane"></i>
                    </button>
                </div>
            </div>
        </div>
    `;

    const input = document.getElementById('chat-input');
    const counter = document.getElementById('char-counter');
    if (input && counter) {
        input.addEventListener('input', () => {
            counter.innerText = `${input.value.length} / 200`;
        });
    }
    
    setTimeout(() => {
        const msgContainer = document.getElementById('chat-messages');
        if (msgContainer) msgContainer.scrollTop = msgContainer.scrollHeight;
    }, 100);
}

function setChatMode(mode) {
    currentChatMode = mode;
    renderView();
}

async function sendChatMessage() {
    const input = document.getElementById('chat-input');
    if (!input || isChatSending) return;
    
    const text = input.value.trim();
    if (!text) return;

    if (getDailyChatCount() >= dailyChatLimit) {
        alert("لقد وصلت للحد الأقصى من الرسائل اليومية (20 رسالة).");
        return;
    }

    if (text.length > maxCharLimit) {
        alert("الرسالة طويلة جداً، الحد الأقصى 200 حرف.");
        return;
    }

    isChatSending = true;
    chatMessages.push({ role: 'user', content: text });
    input.value = '';
    isTyping = true;
    renderView();

    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message: text, 
                mode: currentChatMode,
                history: chatMessages.slice(-10)
            })
        });
        
        const data = await res.json();
        
        if (res.ok && data.reply) {
            chatMessages.push({ role: 'ai', content: data.reply });
            incrementDailyChatCount();
        } else {
            // إظهار الخطأ القادم من السيرفر إذا وجد
            const errorMsg = data.error || 'عذراً، حدث خطأ في الاتصال.';
            chatMessages.push({ role: 'ai', content: `❌ خطأ: ${errorMsg}` });
        }
    } catch (e) {
        chatMessages.push({ role: 'ai', content: 'عذراً، الخادم غير متوفر حالياً.' });
    }
    
    isTyping = false;
    isChatSending = false;
    renderView();
}

// Games View
function renderGamesView(container) {
    container.innerHTML = `
        <div class="games-container" style="text-align:center; padding:40px;">
            <h2 style="color:var(--burgundy-color);">🎮 Games</h2>
            <p>قريباً ألعاب تعليمية ممتعة!</p>
        </div>
    `;
}

function applyTheme() {
    const saved = localStorage.getItem('polyglots_theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);
}

init();
