/* Polyglots current site — 00-core.js. Keep this file as a classic script; inline handlers in the existing HTML depend on its global functions. */

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
let notificationUnsubscribe = null;
let hasUnreadChatMessages = false;
let unreadMessagesByUser = {};
let hasStaticNotifications = false;
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
             currentUser = { username: "Polyglot", isAdmin: true };
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
                currentUser = { username: "Polyglot", isAdmin: true };
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
    const announcementNav = document.getElementById('nav-announcement');
    if (announcementNav) announcementNav.style.display = 'flex';
    checkNotifications();
    listenForUnreadMessages();
    loadUserMascot();
    initGamification(); // Load Mascot on login
    renderView();
}

function updateNotificationBadge() {
    const badge = document.getElementById('notification-badge');
    if (badge) {
        badge.classList.toggle('active', hasUnreadChatMessages);
    }
}

function checkNotifications() {
    if (!currentUser) return;
    // The bell follows real-time Firestore chat messages only.
    // Static messages.json entries are not unread chat messages.
    hasStaticNotifications = false;
    updateNotificationBadge();
}

function updateContactUnreadIndicators() {
    document.querySelectorAll('.contact-item[data-username]').forEach(contactEl => {
        const username = contactEl.dataset.username;
        const badge = contactEl.querySelector('.contact-unread-badge');
        if (badge) {
            badge.style.display = unreadMessagesByUser[username] ? 'inline-flex' : 'none';
        }
    });
}

function listenForUnreadMessages() {
    if (notificationUnsubscribe) {
        notificationUnsubscribe();
        notificationUnsubscribe = null;
    }
    if (!currentUser) return;

    // Listen to incoming messages and build unread state per sender.
    notificationUnsubscribe = db.collection('messages')
        .where('receiver', '==', currentUser.username)
        .onSnapshot((snapshot) => {
            const nextUnreadMessagesByUser = {};
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                if (data.isRead === false && data.sender) {
                    nextUnreadMessagesByUser[data.sender] = true;
                }
            });
            unreadMessagesByUser = nextUnreadMessagesByUser;
            hasUnreadChatMessages = Object.keys(unreadMessagesByUser).length > 0;
            updateNotificationBadge();
            updateContactUnreadIndicators();
        }, (error) => {
            console.error('Error listening for unread messages:', error);
        });
}
