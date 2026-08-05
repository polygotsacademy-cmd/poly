// Firebase Imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Firebase Configuration
const firebaseConfig = {
    apiKey: "[AIzaSyAAhoeHyRF_X85YWEqDmyzjRJD9Yavh3bs]",
    authDomain: "poly-academy.firebaseapp.com",
    projectId: "poly-academy",
    storageBucket: "poly-academy.firebasestorage.app",
    messagingSenderId: "598496806275",
    appId: "1:598496806275:web:d237b5e03f890571ede2b6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const messagesRef = collection(db, "messages");

// App State
let words = [];
let stories = [];
let quizzes = [];
let materials = [];
let messages = []; // Legacy static messages
let currentUser = null;
let currentView = 'words';
let currentCategory = 'Alle';
let chatMessages = []; // AI Chatbot messages
let isTyping = false;
let isChatSending = false;
let currentChatMode = 'translator';
let selectedImage = null;
let selectedAudio = null;
let mediaRecorder = null;
let audioChunks = [];
let recordingInterval = null;
let recordingTime = 0;

// Messaging State
let currentChatUser = null;
let directMessages = [];
let unsubscribeChat = null;

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
    } catch (e) {
        console.error("Failed to load data", e);
    }
}

function setupEventListeners() {
    document.getElementById('login-form').addEventListener('submit', handleLogin);

    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            toggleOverlay(sidebar.classList.contains('open'));
        });
    }

    const bell = document.getElementById('notification-bell');
    if (bell) {
        bell.addEventListener('click', () => {
            switchView('messages');
        });
    }

    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            switchView(item.dataset.view);
            if (sidebar) sidebar.classList.remove('open');
            toggleOverlay(false);
        });
    });

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
            localStorage.setItem('polyglots_isAdmin', data.user.isAdmin);
            if (data.user.studentsList) {
                localStorage.setItem('polyglots_studentsList', JSON.stringify(data.user.studentsList));
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
                localStorage.setItem('polyglots_isAdmin', data.user.isAdmin);
                if (data.user.studentsList) {
                    localStorage.setItem('polyglots_studentsList', JSON.stringify(data.user.studentsList));
                }
                showApp();
                switchView('words');
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
    
    const searchBar = document.getElementById('search-bar-container');
    if (view === 'words') {
        searchBar.style.display = 'block';
    } else {
        searchBar.style.display = 'none';
    }

    // Cleanup Firestore listener when leaving messages view
    if (view !== 'messages' && unsubscribeChat) {
        unsubscribeChat();
        unsubscribeChat = null;
        currentChatUser = null;
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

// --- MESSAGING SYSTEM (WhatsApp Style) ---

function renderMessagesView(container) {
    if (!currentUser) {
        container.innerHTML = '<div style="text-align:center; padding:40px;">Please login to see messages.</div>';
        return;
    }

    const isAdmin = localStorage.getItem('polyglots_isAdmin') === 'true';
    let contacts = [];

    if (!isAdmin) {
        contacts = [
            { username: 'يوسف', displayName: 'Polyglots Academy' },
            { username: 'فراو', displayName: 'Frau Hadeel' },
            { username: 'frau_farida', displayName: 'Assistant' }
        ];
    } else {
        const students = JSON.parse(localStorage.getItem('polyglots_studentsList') || '[]');
        contacts = students.map(s => ({ username: s, displayName: s }));
    }

    container.innerHTML = `
        <div class="messages-container">
            <div class="contacts-list" id="contacts-list">
                <div class="contacts-header">الرسائل</div>
                <div class="contacts-scroll">
                    ${contacts.map(c => `
                        <div class="contact-item ${currentChatUser === c.username ? 'active' : ''}" onclick="selectContact('${c.username}', '${c.displayName}')">
                            <div class="contact-avatar">${c.displayName.charAt(0)}</div>
                            <div class="contact-info">
                                <span class="contact-name">${c.displayName}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="chat-window" id="chat-window">
                ${currentChatUser ? renderChatWindow(contacts.find(c => c.username === currentChatUser).displayName) : `
                    <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:#888;">
                        <i class="fas fa-comments" style="font-size:50px; margin-bottom:15px;"></i>
                        <p>اختر جهة اتصال لبدء المحادثة</p>
                    </div>
                `}
            </div>
        </div>
    `;

    if (currentChatUser) {
        loadChat();
    }
}

function renderChatWindow(displayName) {
    return `
        <div class="chat-header">
            <button class="back-to-contacts" onclick="closeChat()"><i class="fas fa-arrow-right"></i></button>
            <div class="contact-avatar">${displayName.charAt(0)}</div>
            <div class="contact-info">
                <span class="contact-name">${displayName}</span>
            </div>
        </div>
        <div class="chat-messages" id="direct-chat-messages">
            <!-- Messages will load here -->
        </div>
        <div class="chat-input-area">
            <input type="text" id="direct-chat-input" placeholder="اكتب رسالة..." onkeypress="if(event.key === 'Enter') sendDirectMessage()">
            <button class="send-btn" onclick="sendDirectMessage()"><i class="fas fa-paper-plane"></i></button>
        </div>
    `;
}

function selectContact(username, displayName) {
    currentChatUser = username;
    const chatWindow = document.getElementById('chat-window');
    chatWindow.innerHTML = renderChatWindow(displayName);
    chatWindow.classList.add('active');
    
    // Update active state in list
    document.querySelectorAll('.contact-item').forEach(item => {
        item.classList.toggle('active', item.innerText.includes(displayName));
    });

    loadChat();
}

function closeChat() {
    currentChatUser = null;
    if (unsubscribeChat) {
        unsubscribeChat();
        unsubscribeChat = null;
    }
    const chatWindow = document.getElementById('chat-window');
    chatWindow.classList.remove('active');
    renderView();
}

function loadChat() {
    if (!currentUser || !currentChatUser) return;
    
    if (unsubscribeChat) unsubscribeChat();

    const chatId = [currentUser.username, currentChatUser].sort().join('_');
    const q = query(messagesRef, where("chatId", "==", chatId), orderBy("timestamp", "asc"));

    unsubscribeChat = onSnapshot(q, (snapshot) => {
        const chatContainer = document.getElementById('direct-chat-messages');
        if (!chatContainer) return;

        chatContainer.innerHTML = snapshot.docs.map(doc => {
            const data = doc.data();
            const isSent = data.sender === currentUser.username;
            const time = data.timestamp ? new Date(data.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...';
            
            return `
                <div class="message-bubble ${isSent ? 'sent' : 'received'}">
                    ${data.text}
                    <span class="message-time">${time}</span>
                </div>
            `;
        }).join('');
        
        chatContainer.scrollTop = chatContainer.scrollHeight;
    });
}

async function sendDirectMessage() {
    const input = document.getElementById('direct-chat-input');
    const text = input.value.trim();
    if (!text || !currentUser || !currentChatUser) return;

    const chatId = [currentUser.username, currentChatUser].sort().join('_');
    
    try {
        await addDoc(messagesRef, {
            chatId: chatId,
            sender: currentUser.username,
            receiver: currentChatUser,
            text: text,
            timestamp: serverTimestamp()
        });
        input.value = '';
    } catch (e) {
        console.error("Error sending message: ", e);
    }
}

// --- REST OF THE APP LOGIC ---

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

function playWordAudio(id) {
    const word = words.find(w => w.id === id);
    if (word) {
        const utterance = new SpeechSynthesisUtterance(word.word);
        utterance.lang = 'de-DE';
        speechSynthesis.speak(utterance);
    }
}

function renderStoriesView(container) {
    const html = `
        <div class="view-header" style="padding: 10px 20px; text-align: right;">
            <h2 style="color: var(--burgundy-color); font-family: 'Cairo', sans-serif;"><i class="fas fa-book-open"></i> Stories</h2>
        </div>
        <div class="stories-list" style="padding: 15px;">
            ${stories.map((s, index) => `
                <div class="story-card" onclick="renderStoryFull(${index})" style="background: white; border-radius: 15px; padding: 20px; margin-bottom: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); cursor: pointer; display: flex; align-items: center; gap: 15px; flex-direction: row-reverse;">
                    <div class="story-number" style="background: var(--burgundy-color); color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold;">${index + 1}</div>
                    <div class="story-info" style="flex: 1; text-align: right;">
                        <h3 style="font-family: 'Cairo', sans-serif;">${s.title}</h3>
                        <p style="color: #777; font-size: 14px;">${s.level || 'Beginner'}</p>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    container.innerHTML = html;
}

window.renderStoryFull = function(index) {
    const s = stories[index];
    const main = document.getElementById('main-content');
    main.innerHTML = `
        <div class="story-full-view" style="padding: 20px;">
            <button class="back-btn" onclick="renderView()" style="background: #f0f0f0; border: none; padding: 8px 15px; border-radius: 10px; cursor: pointer; margin-bottom: 20px;"><i class="fas fa-arrow-left"></i> العودة</button>
            <div class="story-text-box" style="background: white; padding: 30px; border-radius: 20px; box-shadow: 0 5px 25px rgba(0,0,0,0.1);">
                <h2 style="text-align: center; color: var(--burgundy-color); margin-bottom: 30px;">${s.title}</h2>
                <div class="german-text" style="font-size: 20px; line-height: 1.8; margin-bottom: 30px; text-align: left;">${s.german}</div>
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                <div class="arabic-translation" style="font-size: 18px; line-height: 1.8; color: #666; text-align: right; font-family: 'Cairo', sans-serif;">${s.arabic}</div>
            </div>
        </div>
    `;
    window.scrollTo(0, 0);
};

function renderQuizzesView(container) {
    if (selectedQuizMode) {
        renderQuizMode(container);
    } else if (selectedQuizCategory) {
        renderQuizModesSelection(container);
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
            <h2 style="font-family: 'Cairo', sans-serif; color: var(--burgundy-color);">📝 اختبر معلوماتك</h2>
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
        <div class="quiz-modes-view" style="padding: 20px; text-align: center;">
            <button class="back-btn" onclick="window.selectedQuizCategory=null; renderView();" style="float: right; background: #eee; border: none; padding: 8px 15px; border-radius: 10px; cursor: pointer;"><i class="fas fa-arrow-left"></i> رجوع</button>
            <h2 style="font-family: 'Cairo', sans-serif; margin-bottom: 30px; clear: both;">اختر نمط الاختبار: ${selectedQuizCategory}</h2>
            
            <div class="modes-container" style="display: flex; flex-direction: column; gap: 20px; max-width: 400px; margin: 0 auto;">
                <div class="mode-card" onclick="startQuizMode('flashcards')" style="background: white; padding: 25px; border-radius: 20px; box-shadow: 0 5px 15px rgba(0,0,0,0.08); cursor: pointer;">
                    <div style="font-size: 40px; margin-bottom: 10px;">🎴</div>
                    <h3 style="font-family: 'Cairo', sans-serif;">نمط الكروت (Flashcards)</h3>
                </div>
                <div class="mode-card" onclick="startQuizMode('mcq')" style="background: white; padding: 25px; border-radius: 20px; box-shadow: 0 5px 15px rgba(0,0,0,0.08); cursor: pointer;">
                    <div style="font-size: 40px; margin-bottom: 10px;">🎯</div>
                    <h3 style="font-family: 'Cairo', sans-serif;">اختيار من متعدد (MCQ)</h3>
                </div>
                <div class="mode-card" onclick="startQuizMode('spelling')" style="background: white; padding: 25px; border-radius: 20px; box-shadow: 0 5px 15px rgba(0,0,0,0.08); cursor: pointer;">
                    <div style="font-size: 40px; margin-bottom: 10px;">✍️</div>
                    <h3 style="font-family: 'Cairo', sans-serif;">نمط الكتابة (Spelling)</h3>
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
    renderView();
}

function renderQuizMode(container) {
    if (currentQuizIndex >= quizWords.length) {
        renderQuizResult(container);
        return;
    }
    const word = quizWords[currentQuizIndex];
    let modeHtml = "";
    if (selectedQuizMode === 'flashcards') modeHtml = renderFlashcardsUI(word);
    else if (selectedQuizMode === 'mcq') modeHtml = renderMCQUI(word);
    else if (selectedQuizMode === 'spelling') modeHtml = renderSpellingUI(word);

    container.innerHTML = `
        <div class="quiz-container-active" style="padding: 15px;">
            <div class="quiz-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <span style="font-weight: bold; color: var(--burgundy-color);">${currentQuizIndex + 1} / ${quizWords.length}</span>
                <button onclick="window.selectedQuizMode=null; renderView();" style="background: none; border: none; color: #999; cursor: pointer;"><i class="fas fa-times"></i> إنهاء</button>
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
                    <div class="card-front ${word.art}">
                        <span style="font-size: 80px;">${word.emoji}</span>
                        <span class="word" style="font-size: 32px;">${word.word}</span>
                    </div>
                    <div class="card-back">
                        <span style="font-size: 32px; font-family: 'Cairo', sans-serif;">${word.ar}</span>
                        <button class="btn-audio" onclick="event.stopPropagation(); playWordAudio(${word.id})">🔊</button>
                    </div>
                </div>
            </div>
        </div>
        <div style="text-align: center; margin-top: 30px;">
            <button class="next-btn" onclick="nextQuizQuestion()">التالي ➡️</button>
        </div>
    `;
}

function renderMCQUI(word) {
    const distractors = words.filter(w => w.cat === selectedQuizCategory && w.id !== word.id).sort(() => Math.random() - 0.5).slice(0, 3).map(w => w.ar);
    const options = [word.ar, ...distractors].sort(() => Math.random() - 0.5);

    return `
        <div class="mcq-quiz-view">
            <div class="question-box" style="text-align: center; padding: 30px; background: white; border-radius: 20px; margin-bottom: 20px;">
                <span style="font-size: 60px;">${word.emoji}</span>
                <h2>${word.word}</h2>
            </div>
            <div class="quiz-options">
                ${options.map(opt => `
                    <button class="quiz-option ${quizAnswered ? (opt === word.ar ? 'correct' : (opt === selectedAnswer ? 'wrong' : '')) : ''}" 
                        onclick="answerMCQ('${opt.replace(/'/g, "\\'")}', '${word.ar.replace(/'/g, "\\'")}')">${opt}</button>
                `).join('')}
            </div>
            ${quizAnswered ? `<div style="text-align: center; margin-top: 20px;"><button class="next-btn" onclick="nextQuizQuestion()">التالي ➡️</button></div>` : ''}
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
            <div class="question-box" style="text-align: center; padding: 30px; background: white; border-radius: 20px; margin-bottom: 20px;">
                <span style="font-size: 60px;">${word.emoji}</span>
                <h2 style="font-family: 'Cairo', sans-serif;">${word.ar}</h2>
            </div>
            <div style="max-width: 400px; margin: 0 auto;">
                <input type="text" id="spelling-input" value="${spellingInput}" oninput="window.spellingInput = this.value" placeholder="اكتب بالألمانية..." style="width: 100%; padding: 15px; border-radius: 15px; border: 2px solid #eee; text-align: center; font-size: 20px;">
                ${quizAnswered ? `
                    <div style="margin-top: 20px; text-align: center;">
                        <p style="color: ${spellingInput.toLowerCase().trim() === word.word.toLowerCase().trim() ? 'green' : 'red'}; font-weight: bold;">
                            ${spellingInput.toLowerCase().trim() === word.word.toLowerCase().trim() ? '✅ صح!' : '❌ خطأ!'}
                        </p>
                        <p>الصح: ${word.word}</p>
                    </div>
                ` : `<button class="start-quiz-btn" onclick="checkSpelling('${word.word.replace(/'/g, "\\'")}')" style="width: 100%; margin-top: 20px;">تحقق</button>`}
            </div>
            ${quizAnswered ? `<div style="text-align: center; margin-top: 20px;"><button class="next-btn" onclick="nextQuizQuestion()">التالي ➡️</button></div>` : ''}
        </div>
    `;
}

function checkSpelling(correct) {
    quizAnswered = true;
    if (spellingInput.toLowerCase().trim() === correct.toLowerCase().trim()) {
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
    container.innerHTML = `
        <div class="quiz-result" style="text-align: center; padding: 40px;">
            <h2>اكتمل الاختبار!</h2>
            <div class="result-score">${quizScore} / ${quizWords.length}</div>
            <p class="result-percent">${percentage}%</p>
            <button class="start-quiz-btn" onclick="window.selectedQuizMode=null; renderView();">العودة</button>
        </div>
    `;
}

function playSFX(url) {
    new Audio(url).play().catch(() => {});
}

function renderMaterialsView(container) {
    const groups = ["Alle", "Sa10:00", "Sa12:00", "Sa01:30", "De6:00"];
    let selectedGroup = localStorage.getItem('selected_group') || "Alle";

    const filterHtml = `<div class="materials-filter" style="display:flex; gap:10px; overflow-x:auto; padding:10px;">
        ${groups.map(g => `<button class="cat-btn ${selectedGroup === g ? 'active' : ''}" onclick="setMaterialGroup('${g}')">${g}</button>`).join('')}
    </div>`;

    const filtered = materials.filter(m => selectedGroup === 'Alle' || m.group === selectedGroup);

    const contentHtml = filtered.length > 0 
        ? filtered.map(m => `
            <div class="material-card">
                <span class="badge ${m.type}">${m.type}</span>
                <h3>${m.title}</h3>
                <p>${m.description}</p>
                <div class="deadline">Deadline: ${m.deadline}</div>
                ${m.link ? `<a href="${m.link}" target="_blank" class="material-btn">Open Link</a>` : ''}
            </div>
        `).join('')
        : `<div style="text-align:center; padding:40px;">لا يوجد واجبات حالياً</div>`;

    container.innerHTML = filterHtml + contentHtml;
}

function setMaterialGroup(g) {
    localStorage.setItem('selected_group', g);
    renderView();
}

function renderPronunciationView(container) {
    container.innerHTML = `
        <div class="pronunciation-container">
            <h2 style="text-align: right; font-family: 'Cairo', sans-serif;">نطق الكلمات</h2>
            <textarea id="pron-text" placeholder="اكتب أي نص ألماني هنا ليتم نطقه..."></textarea>
            <div class="pronunciation-btns">
                <button class="listen-btn" onclick="speakText()">🔊 استمع</button>
                <button class="clear-btn" onclick="document.getElementById('pron-text').value=''">مسح</button>
            </div>
        </div>
    `;
}

window.speakText = function() {
    const text = document.getElementById('pron-text').value;
    if (text) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'de-DE';
        speechSynthesis.speak(utterance);
    }
};

// --- AI Chatbot Logic ---

function renderChatView(container) {
    const usage = getDailyUsage();
    container.innerHTML = `
        <div class="polyglots-chat-container">
            <div class="chat-header-poly">
                <div class="ai-info">
                    <i class="fas fa-robot"></i>
                    <span>Polyglots AI</span>
                </div>
                <div class="chat-modes">
                    <button class="mode-btn ${currentChatMode === 'translator' ? 'active' : ''}" onclick="setChatMode('translator')">مترجم</button>
                    <button class="mode-btn ${currentChatMode === 'teacher' ? 'active' : ''}" onclick="setChatMode('teacher')">مدرس</button>
                </div>
            </div>
            <div class="chat-messages-poly" id="chat-messages">
                ${chatMessages.map(msg => `
                    <div class="msg-poly ${msg.role}">
                        <div class="msg-content">${msg.content}</div>
                    </div>
                `).join('')}
                ${isTyping ? '<div class="msg-poly ai">... جاري التفكير</div>' : ''}
            </div>
            <div class="chat-input-poly">
                <div class="input-wrapper">
                    <input type="text" id="chat-input" placeholder="اكتب هنا..." onkeypress="if(event.key === 'Enter') sendMessage()">
                    <button class="send-btn-poly" onclick="sendMessage()"><i class="fas fa-paper-plane"></i></button>
                </div>
            </div>
        </div>
    `;
    setTimeout(() => {
        const msgs = document.getElementById('chat-messages');
        if (msgs) msgs.scrollTop = msgs.scrollHeight;
    }, 100);
}

function setChatMode(mode) {
    currentChatMode = mode;
    renderView();
}

async function sendMessage() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text || isChatSending) return;

    chatMessages.push({ role: 'user', content: text });
    input.value = '';
    isChatSending = true;
    isTyping = true;
    renderView();

    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: currentChatMode, text: text, history: chatMessages.slice(-5) })
        });
        const data = await res.json();
        chatMessages.push({ role: 'ai', content: data.reply || 'حدث خطأ' });
    } catch (e) {
        chatMessages.push({ role: 'ai', content: 'خطأ في الاتصال' });
    } finally {
        isChatSending = false;
        isTyping = false;
        renderView();
    }
}

function getDailyUsage() {
    const today = new Date().toISOString().split('T')[0];
    const usage = JSON.parse(localStorage.getItem('polyglots_usage') || '{}');
    if (usage.date !== today) return { date: today, images: 0, voice: 0, text: 0 };
    return usage;
}

// Games
function renderGamesView(container) {
    container.innerHTML = `
        <div class="games-container" style="padding: 20px; text-align: center;">
            <h2 style="font-family: 'Cairo', sans-serif;">🎮 Games</h2>
            <div class="games-grid" style="display: grid; gap: 20px; margin-top: 20px;">
                <div class="game-card" onclick="openGame('poly6_modified.html')" style="background: white; padding: 20px; border-radius: 15px; cursor: pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                    <h3>Team Battle ⚔️</h3>
                </div>
                <div class="game-card" onclick="openGame('derdiedas.html')" style="background: white; padding: 20px; border-radius: 15px; cursor: pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                    <h3>Der Die Das 🎯</h3>
                </div>
            </div>
        </div>
    `;
}

function openGame(file) {
    const main = document.getElementById('main-content');
    main.innerHTML = `
        <div style="padding: 10px;">
            <button onclick="switchView('games')" style="margin-bottom: 10px; padding: 5px 15px; border-radius: 10px; border: none; background: #eee; cursor: pointer;">Back</button>
            <iframe src="${file}" style="width: 100%; height: 80vh; border: none; border-radius: 15px; box-shadow: 0 5px 15px rgba(0,0,0,0.1);"></iframe>
        </div>
    `;
}

function applyTheme() {
    const saved = localStorage.getItem('polyglots_theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);
}

// Attach to window for global access (needed for type="module")
window.setCategory = setCategory;
window.playWordAudio = playWordAudio;
window.setMaterialGroup = setMaterialGroup;
window.selectQuizCategory = selectQuizCategory;
window.startQuizMode = startQuizMode;
window.answerMCQ = answerMCQ;
window.checkSpelling = checkSpelling;
window.nextQuizQuestion = nextQuizQuestion;
window.setChatMode = setChatMode;
window.sendMessage = sendMessage;
window.openGame = openGame;
window.switchView = switchView;
window.renderView = renderView;
window.selectContact = selectContact;
window.closeChat = closeChat;
window.sendDirectMessage = sendDirectMessage;

// Expose state for quiz buttons
window.selectedQuizCategory = selectedQuizCategory;
window.selectedQuizMode = selectedQuizMode;
window.spellingInput = spellingInput;

init();
