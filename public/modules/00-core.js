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
let userAccessTimer = null;
let lastSeenWriteAt = 0;
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

async function loadFirestoreContent() {
    if (!currentUser) return;
    try {
        const [wordSnapshot, storySnapshot] = await Promise.all([
            db.collection('contentWords').where('published', '==', true).get(),
            db.collection('contentStories').where('published', '==', true).get()
        ]);
        const allowed = item => item.audience === 'all' || (item.recipients || []).includes(currentUser.username);
        const firestoreWords = wordSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), art: doc.data().art || '', cat: doc.data().cat || 'Alle', word: doc.data().word || '', ar: doc.data().ar || '', pl: doc.data().pl || '' })).filter(allowed);
        const firestoreStories = storySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(allowed);
        if (firestoreWords.length) words = [...words, ...firestoreWords];
        if (firestoreStories.length) stories = [...stories, ...firestoreStories];
    } catch (error) {
        console.warn('Firestore content is unavailable; keeping JSON content.', error);
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

    // Logout
    const logoutButton = document.getElementById('logout-btn');
    if (logoutButton) logoutButton.addEventListener('click', logout);

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
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const remember = document.getElementById('remember').checked;
    const loginError = document.getElementById('login-error');
    const loginButton = document.getElementById('login-btn');

    loginError.innerText = '';
    if (loginButton) {
        loginButton.disabled = true;
        loginButton.setAttribute('aria-busy', 'true');
    }

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ username, password, remember })
        });
        const data = await res.json();

        if (data.success) {
            if (window.resetAIUsageCache) window.resetAIUsageCache();
            if (window.resetChatUsageCache) window.resetChatUsageCache();
            currentUser = data.user;
            // Keep only non-sensitive profile data for legacy modules; never store the password.
            localStorage.setItem('polyglots_auth_data', JSON.stringify(data.user));
            localStorage.removeItem('polyglots_user');
            if (!(await enforceCurrentUserAccess())) return;
            await loadFirestoreContent();
            showApp();
            startUserAccessMonitor();
            switchView('words');
            window.scrollTo(0, 0);
        } else {
            loginError.innerText = data.error || 'Login failed';
        }
    } catch (err) {
        console.error('Login error:', err);
        loginError.innerText = 'Could not connect to the server. Please try again.';
    } finally {
        if (loginButton) {
            loginButton.disabled = false;
            loginButton.removeAttribute('aria-busy');
        }
    }
}

const DEFAULT_VISIBLE_SECTIONS = ['words', 'stories', 'quizzes', 'pronunciation', 'games', 'chat', 'messages', 'leaderboard'];
const SECTION_PERMISSION_MAP = { words: 'words', stories: 'stories', quizzes: 'quizzes', daily: 'quizzes', pronunciation: 'pronunciation', games: 'games', chat: 'chat', messages: 'messages', leaderboard: 'leaderboard' };

function getCurrentUserVisibleSections() {
    if (!currentUser || currentUser.isAdmin === true) return DEFAULT_VISIBLE_SECTIONS;
    return Array.isArray(currentUser.visibleSections) ? currentUser.visibleSections : DEFAULT_VISIBLE_SECTIONS;
}

function isSectionAllowed(view) {
    if (view === 'admin' || view === 'announcement') return currentUser?.isAdmin === true || view === 'announcement';
    if (!currentUser) return false;
    if (view === 'chat' && currentUser.aiEnabled === false) return false;
    const permissionKey = SECTION_PERMISSION_MAP[view];
    return permissionKey ? getCurrentUserVisibleSections().includes(permissionKey) : true;
}

function applySectionVisibility() {
    document.querySelectorAll('.nav-item[data-view]').forEach(item => {
        const view = item.dataset.view;
        const allowed = isSectionAllowed(view);
        item.style.display = allowed ? 'flex' : 'none';
        if (!allowed) item.classList.remove('active');
    });
    if (currentView && !isSectionAllowed(currentView)) {
        const fallback = ['words', 'stories', 'quizzes', 'daily', 'pronunciation', 'games', 'chat', 'messages', 'leaderboard'].find(candidate => isSectionAllowed(candidate));
        if (fallback) {
            currentView = fallback;
            if (document.getElementById('app-container')?.classList.contains('active') && typeof renderView === 'function') renderView();
        }
    }
}

async function enforceCurrentUserAccess() {
    if (!currentUser || !currentUser.username || currentUser.username === 'يوسف') {
        applySectionVisibility();
        return true;
    }
    try {
        const doc = await db.collection('users').doc(currentUser.username).get();
        const profile = doc.exists ? doc.data() : {};
        if (profile.active === false) {
            await logout();
            const error = document.getElementById('login-error');
            if (error) error.innerText = 'This account has been suspended. Please contact the academy administration.';
            return false;
        }
        currentUser = { ...currentUser, ...profile, username: currentUser.username };
        localStorage.setItem('polyglots_auth_data', JSON.stringify(currentUser));
        applySectionVisibility();
        const now = Date.now();
        if (now - lastSeenWriteAt > 5 * 60 * 1000) {
            lastSeenWriteAt = now;
            await db.collection('users').doc(currentUser.username).set({ lastSeen: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
        }
        return true;
    } catch (error) {
        console.error('User access check failed:', error);
        return true;
    }
}

function startUserAccessMonitor() {
    if (userAccessTimer) clearInterval(userAccessTimer);
    if (!currentUser || currentUser.username === 'يوسف') return;
    userAccessTimer = setInterval(enforceCurrentUserAccess, 60 * 1000);
}

async function checkRememberedUser() {
    // Old versions stored the password locally. Remove it without using or transmitting it.
    localStorage.removeItem('polyglots_user');

    try {
        const res = await fetch('/api/session', { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && data.user) {
            if (window.resetAIUsageCache) window.resetAIUsageCache();
            if (window.resetChatUsageCache) window.resetChatUsageCache();
            currentUser = data.user;
            localStorage.setItem('polyglots_auth_data', JSON.stringify(data.user));
            if (!(await enforceCurrentUserAccess())) return;
            await loadFirestoreContent();
            showApp();
            startUserAccessMonitor();
            switchView('words');
        }
    } catch (err) {
        console.error('Session restore failed:', err);
    }
}

async function logout() {
    try {
        await fetch('/api/logout', {
            method: 'POST',
            credentials: 'include'
        });
    } catch (err) {
        console.error('Logout request failed:', err);
    }

    if (notificationUnsubscribe) {
        notificationUnsubscribe();
        notificationUnsubscribe = null;
    }
    if (chatUnsubscribe) {
        chatUnsubscribe();
        chatUnsubscribe = null;
    }
    currentUser = null;
    if (userAccessTimer) {
        clearInterval(userAccessTimer);
        userAccessTimer = null;
    }
    const adminNav = document.getElementById('nav-admin');
    if (adminNav) adminNav.style.display = 'none';
    if (window.resetAIUsageCache) window.resetAIUsageCache();
    if (window.resetChatUsageCache) window.resetChatUsageCache();
    localStorage.removeItem('polyglots_auth_data');
    localStorage.removeItem('polyglots_user');
    document.getElementById('app-container').classList.remove('active');
    document.getElementById('login-screen').classList.add('active');
    document.getElementById('login-form')?.reset();
    document.getElementById('login-error').innerText = '';
}

function showApp() {
    document.getElementById('login-screen').classList.remove('active');
    document.getElementById('app-container').classList.add('active');
    const announcementNav = document.getElementById('nav-announcement');
    if (announcementNav) announcementNav.style.display = 'flex';
    const adminNav = document.getElementById('nav-admin');
    const isYusufAdmin = currentUser?.username === 'يوسف' && currentUser?.isAdmin === true;
    if (adminNav) adminNav.style.display = isYusufAdmin ? 'flex' : 'none';
    applySectionVisibility();
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
