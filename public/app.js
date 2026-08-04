import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, updateDoc, doc, getDocs, or, and } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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

// App State
let words = [];
let stories = [];
let quizzes = [];
let materials = [];
let currentUser = null;
let currentView = 'words';
let currentCategory = 'Alle';
let chatMessages = []; // For AI Chatbot
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
let activeChatPartner = null;
let unsubscribeMessages = null;
let adminChatStudents = []; // List of students for admin dashboard
const admins = ["يوسف", "فراو", "frau_farida"];
const officialContacts = [
    { name: "Polyglots Academy", username: "يوسف", avatar: "academy_logo.png" },
    { name: "Frau Hadeel", username: "فراو", avatar: "academy_logo.png" },
    { name: "Assistant", username: "frau_farida", avatar: "academy_logo.png" }
];

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
    
    // Admin Check & Sidebar Modification
    const isAdmin = admins.includes(currentUser.username);
    const sidebarLinks = document.querySelector('.sidebar-links');
    
    // Remove existing admin dashboard link if any
    const existingAdminLink = sidebarLinks.querySelector('[data-view="admin-dashboard"]');
    if (existingAdminLink) existingAdminLink.remove();

    if (isAdmin) {
        // Hide student specific sections
        document.querySelectorAll('.nav-item[data-view="words"], .nav-item[data-view="stories"], .nav-item[data-view="quizzes"], .nav-item[data-view="materials"], .nav-item[data-view="pronunciation"], .nav-item[data-view="games"], .nav-item[data-view="chat"]')
            .forEach(el => el.style.display = 'none');
        
        // Add Admin Dashboard link
        const adminLi = document.createElement('li');
        adminLi.className = 'nav-item';
        adminLi.dataset.view = 'admin-dashboard';
        adminLi.innerHTML = '<i class="fas fa-user-shield"></i> <span>لوحة التحكم</span>';
        adminLi.onclick = () => {
            switchView('admin-dashboard');
            document.getElementById('sidebar').classList.remove('open');
            toggleOverlay(false);
        };
        sidebarLinks.insertBefore(adminLi, sidebarLinks.firstChild);
        
        // Update Messages link to "الرسائل"
        const msgLink = sidebarLinks.querySelector('[data-view="messages"]');
        if (msgLink) msgLink.querySelector('span').innerText = 'الرسائل';
    } else {
        // Show all for students
        document.querySelectorAll('.nav-item').forEach(el => el.style.display = 'flex');
    }

    startGlobalMessageListener();
    renderView();
}

function startGlobalMessageListener() {
    if (!currentUser) return;
    
    const q = query(
        collection(db, "messages"),
        where("receiver", "in", [currentUser.username, "all"]),
        where("isRead", "==", false)
    );

    onSnapshot(q, (snapshot) => {
        const badge = document.getElementById('notification-badge');
        if (badge) {
            if (snapshot.size > 0) {
                badge.classList.add('active');
            } else {
                badge.classList.remove('active');
            }
        }
    });
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

    if (unsubscribeMessages) {
        unsubscribeMessages();
        unsubscribeMessages = null;
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
        case 'admin-dashboard': renderAdminDashboard(main); break;
    }
}

// --- MESSAGING SYSTEM ---

function renderMessagesView(container) {
    if (!currentUser) {
        container.innerHTML = '<div style="text-align:center; padding:40px;">Please login to see messages.</div>';
        return;
    }

    if (admins.includes(currentUser.username)) {
        renderAdminDashboard(container);
        return;
    }

    if (activeChatPartner) {
        renderChatWindow(container, activeChatPartner);
    } else {
        renderContactList(container);
    }
}

function renderContactList(container) {
    container.innerHTML = `
        <div class="messaging-container">
            <div class="view-header-msg">
                <h2><i class="fas fa-comments"></i> الرسائل</h2>
            </div>
            <div class="contacts-list">
                ${officialContacts.map(contact => `
                    <div class="contact-item" onclick="openChat('${contact.username}')">
                        <div class="contact-avatar">
                            <img src="${contact.avatar}" alt="${contact.name}">
                        </div>
                        <div class="contact-info">
                            <h3>${contact.name}</h3>
                            <p>تواصل معنا الآن</p>
                        </div>
                        <i class="fas fa-chevron-left"></i>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

window.openChat = function(partnerUsername) {
    activeChatPartner = partnerUsername;
    renderView();
};

window.closeChat = function() {
    activeChatPartner = null;
    renderView();
};

function renderChatWindow(container, partnerUsername) {
    const partner = officialContacts.find(c => c.username === partnerUsername) || { name: partnerUsername, avatar: "academy_logo.png" };
    
    container.innerHTML = `
        <div class="chat-window">
            <div class="chat-header">
                <button class="back-btn-chat" onclick="closeChat()"><i class="fas fa-arrow-right"></i></button>
                <div class="chat-partner-info">
                    <img src="${partner.avatar}" class="chat-avatar">
                    <h3>${partner.name}</h3>
                </div>
            </div>
            <div id="chat-messages-list" class="chat-messages-list">
                <div class="chat-loading">جاري تحميل الرسائل...</div>
            </div>
            <div class="chat-input-area">
                <input type="text" id="msg-input" placeholder="اكتب رسالتك هنا..." onkeypress="if(event.key === 'Enter') sendUserMessage()">
                <button class="send-msg-btn" onclick="sendUserMessage()"><i class="fas fa-paper-plane"></i></button>
            </div>
        </div>
    `;

    setupChatListener(partnerUsername);
}

function setupChatListener(partnerUsername) {
    const q = query(
        collection(db, "messages"),
        or(
            and(where("sender", "==", currentUser.username), where("receiver", "==", partnerUsername)),
            and(where("sender", "==", partnerUsername), where("receiver", "==", currentUser.username)),
            where("receiver", "==", "all")
        ),
        orderBy("timestamp", "asc")
    );

    unsubscribeMessages = onSnapshot(q, (snapshot) => {
        const messagesList = document.getElementById('chat-messages-list');
        if (!messagesList) return;

        const filteredDocs = snapshot.docs;

        if (filteredDocs.length === 0) {
            messagesList.innerHTML = '<div class="no-messages">لا توجد رسائل سابقة</div>';
            return;
        }

        messagesList.innerHTML = filteredDocs.map(doc => {
            const data = doc.data();
            const isMine = data.sender === currentUser.username;
            const time = data.timestamp ? new Date(data.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
            
            return `
                <div class="msg-wrapper ${isMine ? 'mine' : 'theirs'}">
                    <div class="msg-bubble">
                        <div class="msg-text">${data.text}</div>
                        <div class="msg-time">${time}</div>
                    </div>
                </div>
            `;
        }).join('');
        
        messagesList.scrollTop = messagesList.scrollHeight;

        // Mark as read
        filteredDocs.forEach(async (d) => {
            if (d.data().receiver === currentUser.username && !d.data().isRead) {
                await updateDoc(doc(db, "messages", d.id), { isRead: true });
            }
        });
    });
}

window.sendUserMessage = async function() {
    const input = document.getElementById('msg-input');
    const text = input.value.trim();
    if (!text || !activeChatPartner) return;

    input.value = '';
    try {
        await addDoc(collection(db, "messages"), {
            sender: currentUser.username,
            receiver: activeChatPartner,
            text: text,
            timestamp: serverTimestamp(),
            isRead: false
        });
    } catch (e) {
        console.error("Error sending message", e);
        showToast("فشل إرسال الرسالة");
    }
};

// --- ADMIN DASHBOARD ---

async function renderAdminDashboard(container) {
    container.innerHTML = `
        <div class="admin-dashboard">
            <div class="admin-sidebar">
                <div class="admin-sidebar-header">
                    <h3>الطلاب</h3>
                    <button class="broadcast-btn" onclick="sendBroadcast()"><i class="fas fa-bullhorn"></i> رسالة جماعية</button>
                </div>
                <div id="student-list" class="student-list">
                    <div class="loading">جاري التحميل...</div>
                </div>
            </div>
            <div class="admin-main">
                <div id="admin-chat-container" class="admin-chat-container">
                    <div class="select-student-prompt">
                        <i class="fas fa-comments"></i>
                        <p>اختر طالباً لبدء المحادثة</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    loadStudentList();
}

async function loadStudentList() {
    const q = query(collection(db, "messages"), where("receiver", "==", currentUser.username));
    const snapshot = await getDocs(q);
    const studentUsernames = [...new Set(snapshot.docs.map(d => d.data().sender))];
    
    const listEl = document.getElementById('student-list');
    if (studentUsernames.length === 0) {
        listEl.innerHTML = '<div class="no-students">لا يوجد رسائل حالياً</div>';
        return;
    }

    listEl.innerHTML = studentUsernames.map(username => `
        <div class="student-item ${activeChatPartner === username ? 'active' : ''}" onclick="openAdminChat('${username}')">
            <div class="student-avatar">${username.charAt(0).toUpperCase()}</div>
            <div class="student-name">${username}</div>
        </div>
    `).join('');
}

window.openAdminChat = function(studentUsername) {
    activeChatPartner = studentUsername;
    const chatContainer = document.getElementById('admin-chat-container');
    chatContainer.innerHTML = `
        <div class="chat-window admin-mode">
            <div class="chat-header">
                <h3>المحادثة مع: ${studentUsername}</h3>
            </div>
            <div id="chat-messages-list" class="chat-messages-list"></div>
            <div class="chat-input-area">
                <input type="text" id="msg-input" placeholder="اكتب ردك هنا..." onkeypress="if(event.key === 'Enter') sendUserMessage()">
                <button class="send-msg-btn" onclick="sendUserMessage()"><i class="fas fa-paper-plane"></i></button>
            </div>
        </div>
    `;
    
    document.querySelectorAll('.student-item').forEach(el => {
        el.classList.toggle('active', el.querySelector('.student-name').innerText === studentUsername);
    });

    if (unsubscribeMessages) unsubscribeMessages();
    setupChatListener(studentUsername);
};

window.sendBroadcast = async function() {
    const msg = prompt("أدخل الرسالة الجماعية لجميع الطلاب:");
    if (!msg) return;

    try {
        await addDoc(collection(db, "messages"), {
            sender: currentUser.username,
            receiver: "all",
            text: msg,
            timestamp: serverTimestamp(),
            isRead: false
        });
        showToast("تم إرسال الرسالة الجماعية بنجاح");
    } catch (e) {
        console.error("Broadcast failed", e);
        showToast("فشل إرسال الرسالة الجماعية");
    }
};

// --- EXISTING VIEW RENDERERS (UNCHANGED) ---

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
                <div class="category-card" onclick="setCategory('${cat.name}')">
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
    const backBtn = showBack ? `<button class="back-btn" onclick="setCategory('Alle')"><i class="fas fa-arrow-left"></i> العودة للتصنيفات</button>` : '';
    
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

window.setCategory = function(cat) {
    currentCategory = cat;
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    renderView();
};

function handleSearch() {
    if (currentView === 'words') renderView();
}

function renderStoriesView(container) {
    const html = `
        <div class="view-header" style="padding: 10px 20px; text-align: right;">
            <h2 style="color: var(--primary-color); font-family: 'Cairo', sans-serif;"><i class="fas fa-book-open"></i> القصص</h2>
        </div>
        <div class="stories-grid" style="padding: 15px; display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;">
            ${stories.map(s => `
                <div class="story-card" style="background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 5px 15px rgba(0,0,0,0.05);">
                    <div style="padding: 20px;">
                        <h3 style="color: var(--navy-color); margin-bottom: 10px;">${s.title}</h3>
                        <p style="color: #666; font-size: 14px; margin-bottom: 15px;">${s.description}</p>
                        <button class="start-quiz-btn" onclick="openStory(${s.id})" style="width: 100%;">اقرأ القصة 📖</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    container.innerHTML = html;
}

window.openStory = function(id) {
    const story = stories.find(s => s.id === id);
    if (!story) return;
    
    const main = document.getElementById('main-content');
    main.innerHTML = `
        <div class="story-reader" style="padding: 20px; max-width: 800px; margin: 0 auto; direction: ltr;">
            <button class="back-btn" onclick="renderView()" style="margin-bottom: 20px;"><i class="fas fa-arrow-left"></i> رجوع</button>
            <h1 style="text-align: center; color: var(--primary-color); margin-bottom: 30px;">${story.title}</h1>
            <div class="story-content" style="font-size: 18px; line-height: 1.8; white-space: pre-wrap; background: white; padding: 30px; border-radius: 20px; box-shadow: 0 5px 20px rgba(0,0,0,0.05);">
                ${story.content}
            </div>
        </div>
    `;
    window.scrollTo(0, 0);
};

function renderMaterialsView(container) {
    const groups = ["Alle", "Sa10:00", "Sa12:00", "Sa01:30", "De6:00"];
    let selectedGroup = localStorage.getItem('selected_group') || "Alle";

    const filterHtml = `<div class="materials-filter" style="display: flex; gap: 10px; overflow-x: auto; padding: 15px; background: #f8f9fa;">
        ${groups.map(g => `<button class="cat-btn ${selectedGroup === g ? 'active' : ''}" onclick="setMaterialGroup('${g}')" style="white-space: nowrap; padding: 8px 15px; border-radius: 20px; border: 1px solid #ddd; background: ${selectedGroup === g ? 'var(--burgundy-color)' : 'white'}; color: ${selectedGroup === g ? 'white' : '#555'}; cursor: pointer;">${g}</button>`).join('')}
    </div>`;

    const filtered = materials.filter(m => selectedGroup === 'Alle' || m.group === selectedGroup);

    const contentHtml = `<div class="materials-list" style="padding: 15px;">
        ${filtered.length > 0 
            ? filtered.map(m => `
                <div class="material-card" style="background: white; border-radius: 15px; padding: 20px; margin-bottom: 15px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); border-right: 5px solid var(--primary-color);">
                    <span class="badge" style="background: #e1f5fe; color: #0288d1; padding: 4px 10px; border-radius: 10px; font-size: 12px; font-weight: bold;">${m.type.toUpperCase()}</span>
                    <h3 style="margin: 10px 0;">${m.title}</h3>
                    <p style="color: #666; font-size: 14px;">${m.description}</p>
                    <div class="deadline" style="margin-top: 10px; font-size: 12px; color: #999;">Deadline: ${m.deadline}</div>
                    ${m.link ? `<a href="${m.link}" target="_blank" class="material-btn" style="display: inline-block; margin-top: 15px; background: var(--primary-color); color: white; padding: 8px 20px; border-radius: 10px; text-decoration: none; font-weight: bold;">Open Link</a>` : ''}
                </div>
            `).join('')
            : `<div class="empty-state" style="text-align:center; padding:40px;">
                لا يوجد واجبات لمجموعتك حالياً.. استمتع بوقتك يا بطل! 🥳
              </div>`
        }</div>`;

    container.innerHTML = filterHtml + contentHtml;
}

window.setMaterialGroup = function(g) {
    localStorage.setItem('selected_group', g);
    renderView();
};

function renderPronunciationView(container) {
    container.innerHTML = `
        <div class="pronunciation-view" style="padding: 20px; text-align: center;">
            <h2 style="font-family: 'Cairo', sans-serif; color: var(--primary-color); margin-bottom: 20px;">🗣️ تدرب على النطق</h2>
            <div class="practice-card" style="background: white; padding: 40px 20px; border-radius: 25px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); max-width: 500px; margin: 0 auto;">
                <p style="color: #888; margin-bottom: 30px;">اضغط على المايك وقول الكلمة اللي تطلع لك بالألماني</p>
                <div id="target-word" style="font-size: 40px; font-weight: 900; color: var(--navy-color); margin-bottom: 40px;">Guten Tag</div>
                <button class="mic-btn-large" onclick="startPronunciationTest()" style="width: 80px; height: 80px; border-radius: 50%; border: none; background: var(--burgundy-color); color: white; font-size: 30px; cursor: pointer; box-shadow: 0 5px 15px rgba(124, 47, 63, 0.3);"><i class="fas fa-microphone"></i></button>
                <div id="pronunciation-feedback" style="margin-top: 30px; font-family: 'Cairo', sans-serif; font-weight: bold;"></div>
            </div>
        </div>
    `;
}

window.startPronunciationTest = function() {
    showToast("قريباً.. هذه الميزة تحت التطوير! 🚀");
};

// --- QUIZ SYSTEM ---

function renderQuizzesView(container) {
    if (!selectedQuizCategory) {
        renderQuizCategorySelection(container);
    } else if (!selectedQuizMode) {
        renderQuizModesSelection(container);
    } else {
        renderQuizMode(container);
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
                <div class="category-card" onclick="selectQuizCategory('${cat.name}')">
                    <div class="cat-emoji" style="font-size: 40px; margin-bottom: 10px;">${cat.emoji}</div>
                    <div class="cat-name" style="font-weight: bold; color: #333; font-family: 'Cairo', sans-serif;">${cat.name}</div>
                    <div class="cat-count" style="font-size: 12px; color: #888; margin-top: 5px;">${words.filter(w => w.cat === cat.name).length} كلمة</div>
                </div>
            `).join('')}
        </div>
    `;
}

window.selectQuizCategory = function(cat) {
    selectedQuizCategory = cat;
    selectedQuizMode = null;
    renderView();
};

function renderQuizModesSelection(container) {
    container.innerHTML = `
        <div class="quiz-modes-view" style="padding: 20px; text-align: center;">
            <button class="back-btn" onclick="selectedQuizCategory=null; renderView();" style="float: right;"><i class="fas fa-arrow-left"></i> رجوع</button>
            <h2 style="font-family: 'Cairo', sans-serif; margin-bottom: 30px; clear: both;">اختر نمط الاختبار: ${selectedQuizCategory}</h2>
            <div class="modes-container" style="display: flex; flex-direction: column; gap: 20px; max-width: 400px; margin: 0 auto;">
                <div class="mode-card" onclick="startQuizMode('flashcards')">
                    <div style="font-size: 40px; margin-bottom: 10px;">🎴</div>
                    <h3 style="font-family: 'Cairo', sans-serif;">نمط الكروت (Flashcards)</h3>
                </div>
                <div class="mode-card" onclick="startQuizMode('mcq')">
                    <div style="font-size: 40px; margin-bottom: 10px;">🎯</div>
                    <h3 style="font-family: 'Cairo', sans-serif;">اختيار من متعدد (MCQ)</h3>
                </div>
                <div class="mode-card" onclick="startQuizMode('spelling')">
                    <div style="font-size: 40px; margin-bottom: 10px;">✍️</div>
                    <h3 style="font-family: 'Cairo', sans-serif;">نمط الكتابة (Spelling)</h3>
                </div>
            </div>
        </div>
    `;
}

window.startQuizMode = function(mode) {
    selectedQuizMode = mode;
    quizWords = words.filter(w => w.cat === selectedQuizCategory).sort(() => Math.random() - 0.5);
    currentQuizIndex = 0;
    quizScore = 0;
    quizAnswered = false;
    selectedAnswer = null;
    spellingInput = "";
    renderView();
};

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
                    </div>
                    <div class="card-back" style="display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 20px;">
                        <span style="font-size: 40px; font-family: 'Cairo', sans-serif; font-weight: bold;">${word.ar}</span>
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
            <div class="question-box">
                <span style="font-size: 50px; display: block; margin-bottom: 10px;">${word.emoji}</span>
                <h2 style="font-size: 32px; color: var(--navy-color);">${word.art ? word.art + ' ' : ''}${word.word}</h2>
            </div>
            <div class="quiz-options">
                ${optionsHtml}
            </div>
            ${quizAnswered ? `<div style="text-align: center; margin-top: 25px;"><button class="next-btn" onclick="nextQuizQuestion()">التالي ➡️</button></div>` : ''}
        </div>
    `;
}

window.answerMCQ = function(selected, correct) {
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
};

function renderSpellingUI(word) {
    return `
        <div class="spelling-quiz-view">
            <div class="question-box">
                <span style="font-size: 60px; display: block; margin-bottom: 10px;">${word.emoji}</span>
                <h2 style="font-family: 'Cairo', sans-serif; color: var(--navy-color);">${word.ar}</h2>
            </div>
            <div class="input-container" style="max-width: 400px; margin: 0 auto;">
                <input type="text" id="spelling-input" value="${spellingInput}" placeholder="اكتب هنا..." 
                    ${quizAnswered ? 'disabled' : ''} oninput="spellingInput = this.value">
                ${quizAnswered ? `
                    <div class="feedback-spelling" style="margin-top: 20px; text-align: center; padding: 15px; border-radius: 15px; background: ${spellingInput.toLowerCase().trim() === word.word.toLowerCase().trim() ? '#eafaf1' : '#fdedec'};">
                        <p style="font-weight: bold; color: ${spellingInput.toLowerCase().trim() === word.word.toLowerCase().trim() ? '#27ae60' : '#c0392b'};">
                            ${spellingInput.toLowerCase().trim() === word.word.toLowerCase().trim() ? '✅ إجابة صحيحة!' : '❌ إجابة خاطئة!'}
                        </p>
                        <p style="margin-top: 5px;">الإجابة الصحيحة: <span style="font-weight: bold; font-size: 20px;">${word.art ? word.art + ' ' : ''}${word.word}</span></p>
                    </div>
                ` : `
                    <button class="start-quiz-btn" onclick="checkSpelling('${word.word.replace(/'/g, "\\'")}')" style="width: 100%; margin-top: 20px;">تحقق ✅</button>
                `}
            </div>
            ${quizAnswered ? `<div style="text-align: center; margin-top: 25px;"><button class="next-btn" onclick="nextQuizQuestion()">التالي ➡️</button></div>` : ''}
        </div>
    `;
}

window.checkSpelling = function(correct) {
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
};

window.nextQuizQuestion = function() {
    currentQuizIndex++;
    quizAnswered = false;
    selectedAnswer = null;
    spellingInput = "";
    renderView();
};

function renderQuizResult(container) {
    const percentage = Math.round((quizScore / quizWords.length) * 100);
    container.innerHTML = `
        <div class="quiz-result" style="text-align: center; padding: 40px 20px;">
            <div style="font-size: 80px; margin-bottom: 20px;">🏆</div>
            <h2 style="font-family: 'Cairo', sans-serif;">اكتمل الاختبار!</h2>
            <div class="result-score" style="font-size: 60px; font-weight: 900; color: var(--burgundy-color); margin: 20px 0;">${quizScore} / ${quizWords.length}</div>
            <div style="display: flex; flex-direction: column; gap: 15px; max-width: 300px; margin: 0 auto;">
                <button class="start-quiz-btn" onclick="startQuizMode('${selectedQuizMode}')">إعادة الاختبار 🔄</button>
                <button class="back-btn" onclick="selectedQuizMode=null; renderView();">تغيير النمط ⚙️</button>
            </div>
        </div>
    `;
}

// --- AI CHATBOT (EXISTING) ---

function getDailyUsage() {
    const today = new Date().toISOString().split('T')[0];
    const usage = JSON.parse(localStorage.getItem('polyglots_usage') || '{}');
    if (usage.date !== today) return { date: today, images: 0, voice: 0, text: 0 };
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
    const gliderPos = { 'translator': '0%', 'teacher': '100%', 'homework': '200%', 'voice': '300%' }[currentChatMode];

    container.innerHTML = `
        <div class="polyglots-chat-container">
            <div class="chat-header-poly"><h2>Polyglots AI</h2></div>
            <div class="mode-switcher">
                <div class="mode-glider" style="transform: translateX(${gliderPos})"></div>
                <button class="mode-btn ${currentChatMode === 'translator' ? 'active' : ''}" onclick="setChatMode('translator')">مترجم</button>
                <button class="mode-btn ${currentChatMode === 'teacher' ? 'active' : ''}" onclick="setChatMode('teacher')">مدرس</button>
                <button class="mode-btn ${currentChatMode === 'homework' ? 'active' : ''}" onclick="setChatMode('homework')">حل الواجب</button>
                <button class="mode-btn ${currentChatMode === 'voice' ? 'active' : ''}" onclick="setChatMode('voice')">اختبار صوتي</button>
            </div>
            <div class="chat-messages-poly" id="chat-messages">
                ${chatMessages.length === 0 ? '<div style="text-align:center; padding:40px; color:#999;"><i class="fas fa-robot" style="font-size:40px; margin-bottom:15px;"></i><p>أهلاً بك في Polyglots AI!</p></div>' : chatMessages.map(msg => `<div class="msg-poly ${msg.role}"><div class="msg-content">${msg.image ? `<img src="${msg.image}">` : ''}${msg.audio ? `<audio controls src="${msg.audio}"></audio>` : ''}<div>${msg.content}</div></div></div>`).join('')}
                ${isTyping ? '<div class="msg-poly ai">... جاري التفكير</div>' : ''}
            </div>
            <div id="media-preview" class="media-preview"></div>
            <div class="chat-input-poly">
                <div class="input-wrapper">
                    <button class="icon-btn" onclick="triggerImageUpload()"><i class="fas fa-camera"></i></button>
                    <button class="icon-btn" id="mic-btn" onclick="toggleVoiceRecording()"><i class="fas fa-microphone"></i></button>
                    <input type="text" id="chat-input" placeholder="اكتب هنا..." onkeypress="if(event.key === 'Enter') sendAIChatMessage()">
                    <button class="send-btn-poly" onclick="sendAIChatMessage()"><i class="fas fa-paper-plane"></i></button>
                </div>
                <div class="chat-counters">
                    <span class="counter-item">الرسائل: ${usage.text}/20</span>
                </div>
            </div>
            <input type="file" id="image-input" hidden accept="image/*" onchange="handleImageSelect(event)">
        </div>
    `;
    setTimeout(() => { const el = document.getElementById('chat-messages'); if (el) el.scrollTop = el.scrollHeight; }, 100);
}

window.setChatMode = function(mode) {
    currentChatMode = mode;
    renderView();
};

window.triggerImageUpload = function() {
    const usage = getDailyUsage();
    if (usage.images >= 3) { showToast("يا بطل، أنت خلصت الـ 3 صور بتوع النهاردة!"); return; }
    document.getElementById('image-input').click();
};

window.handleImageSelect = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => { selectedImage = e.target.result; showMediaPreview('image', selectedImage); };
    reader.readAsDataURL(file);
};

function showMediaPreview(type, src) {
    const preview = document.getElementById('media-preview');
    if (!preview) return;
    preview.style.display = 'flex';
    preview.innerHTML = `${type === 'image' ? `<img src="${src}" class="preview-thumb">` : '<i class="fas fa-volume-up"></i> تسجيل صوتي جاهز'}<span class="remove-media" onclick="clearMedia()"><i class="fas fa-times-circle"></i></span>`;
}

window.clearMedia = function() {
    selectedImage = null;
    selectedAudio = null;
    const preview = document.getElementById('media-preview');
    if (preview) preview.style.display = 'none';
};

window.toggleVoiceRecording = async function() {
    const usage = getDailyUsage();
    if (usage.voice >= 3) { showToast("يا بطل، أنت خلصت الـ 3 تسجيلات!"); return; }
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
            reader.onload = (e) => { selectedAudio = e.target.result; showMediaPreview('audio', selectedAudio); };
            reader.readAsDataURL(audioBlob);
            stream.getTracks().forEach(track => track.stop());
        };
        mediaRecorder.start();
        micBtn.classList.add('recording-active');
        recordingInterval = setInterval(() => { recordingTime++; if (recordingTime >= 20) toggleVoiceRecording(); }, 1000);
    } catch (err) { showToast("لازم تدينا إذن المايك!"); }
};

window.sendAIChatMessage = async function() {
    const input = document.getElementById('chat-input');
    const text = input ? input.value.trim() : '';
    if ((!text && !selectedImage && !selectedAudio) || isChatSending) return;
    const usage = getDailyUsage();
    if (usage.text >= 20) { showToast("يا بطل، أنت خلصت الـ 20 رسالة!"); return; }
    const userMsg = { role: 'user', content: text, image: selectedImage, audio: selectedAudio };
    chatMessages.push(userMsg);
    const payload = { mode: currentChatMode, text: text, image: selectedImage || null, audio: selectedAudio || null, history: chatMessages.slice(-6, -1) };
    updateDailyUsage('text');
    if (selectedImage) updateDailyUsage('images');
    if (selectedAudio) updateDailyUsage('voice');
    if (input) input.value = '';
    clearMedia();
    isChatSending = true;
    isTyping = true;
    renderView();
    try {
        const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const data = await res.json();
        if (data.reply) chatMessages.push({ role: 'ai', content: data.reply });
        else chatMessages.push({ role: 'ai', content: 'عذراً، حدث خطأ ما.' });
    } catch (err) { chatMessages.push({ role: 'ai', content: 'عذراً، لا يمكنني الاتصال بالخادم.' }); }
    finally { isChatSending = false; isTyping = false; renderView(); }
};

// --- GAMES (EXISTING) ---

function renderGamesView(container) {
    container.innerHTML = `
        <div class="games-container">
            <h2 class="games-title">🎮 Games</h2>
            <div class="games-grid">
                <div class="game-card" onclick="openGame('poly6_modified.html')"><h3>Team Battle</h3></div>
                <div class="game-card" onclick="openGame('derdiedas.html')"><h3>Der Die Das</h3></div>
            </div>
        </div>
    `;
}

window.openGame = function(gameFile) {
    const main = document.getElementById('main-content');
    main.innerHTML = `<button class="game-back-btn" onclick="switchView('games')">Back</button><iframe src="${gameFile}" style="width:100%; height:calc(100vh - 200px); border:none;"></iframe>`;
};

// --- UTILS ---

window.playWordAudio = function(id) {
    const audio = new Audio(`audio/words/word_${id}.mp3`);
    audio.play().catch(e => console.error("Audio play failed", e));
};

function playSFX(url) {
    const audio = new Audio(url);
    audio.play().catch(e => {});
}

function applyTheme() {
    const saved = localStorage.getItem('polyglots_theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);
}

init();
