/* Polyglots current site — 07-ai-chat.js. Keep this file as a classic script; inline handlers in the existing HTML depend on its global functions. */

const AI_USAGE_LIMITS = { text: 20, images: 3, voice: 3 };
localStorage.removeItem('polyglots_usage'); // Legacy browser-only counter is no longer used.
let aiUsageCache = null;
let aiUsageLoading = false;
window.resetAIUsageCache = function () {
    aiUsageCache = null;
};

function todayKey() {
    return new Date().toISOString().split('T')[0];
}

function emptyDailyUsage() {
    return { date: todayKey(), images: 0, voice: 0, text: 0 };
}

function getDailyUsage() {
    const today = todayKey();
    if (!aiUsageCache || aiUsageCache.date !== today) return emptyDailyUsage();
    return { ...emptyDailyUsage(), ...aiUsageCache };
}

async function loadDailyUsage(force = false) {
    if (!currentUser?.username || !db || (aiUsageLoading && !force)) return getDailyUsage();
    if (!force && aiUsageCache?.date === todayKey()) return getDailyUsage();

    aiUsageLoading = true;
    try {
        const snapshot = await db.collection('users').doc(currentUser.username).get();
        const stored = snapshot.exists && snapshot.data().aiUsage ? snapshot.data().aiUsage : {};
        aiUsageCache = stored.date === todayKey() ? { ...emptyDailyUsage(), ...stored } : emptyDailyUsage();
    } catch (error) {
        console.error('AI usage load failed:', error);
        aiUsageCache = aiUsageCache || emptyDailyUsage();
    } finally {
        aiUsageLoading = false;
    }

    if (typeof currentView !== 'undefined' && currentView === 'chat') renderView();
    return getDailyUsage();
}

async function reserveDailyUsage(requested) {
    if (!currentUser?.username || !db) return { ok: false, error: 'Usage limits cannot be checked right now.' };

    const userRef = db.collection('users').doc(currentUser.username);
    try {
        const result = await db.runTransaction(async transaction => {
            const snapshot = await transaction.get(userRef);
            const stored = snapshot.exists && snapshot.data().aiUsage ? snapshot.data().aiUsage : {};
            const usage = stored.date === todayKey() ? { ...emptyDailyUsage(), ...stored } : emptyDailyUsage();
            const exceeds = Object.entries(requested).some(([type, amount]) =>
                usage[type] + amount > AI_USAGE_LIMITS[type]
            );

            if (exceeds) return { ok: false, usage };

            const nextUsage = {
                ...usage,
                text: usage.text + (requested.text || 0),
                images: usage.images + (requested.images || 0),
                voice: usage.voice + (requested.voice || 0),
                date: todayKey()
            };
            transaction.set(userRef, { aiUsage: nextUsage }, { merge: true });
            return { ok: true, usage: nextUsage };
        });

        if (result.ok) {
            aiUsageCache = result.usage;
            return result;
        }
        aiUsageCache = result.usage || getDailyUsage();
        return { ok: false, usage: aiUsageCache, error: 'Daily usage limit reached.' };
    } catch (error) {
        console.error('AI usage reservation failed:', error);
        return { ok: false, error: 'Could not update the usage limit. Please try again.' };
    }
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
    loadDailyUsage();
    const gliderPos = {
        'translator': '0%',
        'teacher': '100%',
        'homework': '200%',
        'voice': '300%'
    }[currentChatMode];

    const username = currentUser && currentUser.username ? currentUser.username : 'Academy learner';
    const userMascot = window.mascotCache && window.mascotCache[username] ? window.mascotCache[username] : '👤';

    container.innerHTML = `
        <div class="claude-chat-container">
            <div class="claude-header">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 36px; height: 36px; background: #d97706; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: bold;">AI</div>
                    <div>
                        <h2 style="margin: 0; font-size: 16px; font-family: 'Cairo', sans-serif; color: #2d3748;">Polyglots AI</h2>
                        <span style="font-size: 12px; color: #718096; font-family: 'Cairo', sans-serif;">Your smart German-learning assistant</span>
                    </div>
                </div>
            </div>



            <div class="claude-messages-area" id="chat-messages">
                ${chatMessages.length === 0 ? `
                    <div style="text-align: center; color: #a0aec0; margin: auto; font-family: 'Cairo', sans-serif; font-size: 14px;">
                        <i class="fas fa-robot" style="font-size: 32px; margin-bottom: 8px; color: #cbd5e0;"></i>
                        <p>Start the conversation...</p>
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
                                    <button onclick="playGerman(\`${msg.content.replace(/`/g, '\`')}\`)" style="background: #f7fafc; border: 1px solid #e2e8f0; color: #4a5568; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 5px; font-family: 'Cairo', sans-serif;" title="Listen to pronunciation">
                                        <i class="fas fa-volume-up"></i> Listen
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
                            <span>${currentChatMode === 'translator' ? 'Translator' : 'Teacher'}</span>
                            <i class="fas fa-chevron-down" style="font-size: 10px; color: #718096;"></i>
                        </button>
                        <div id="mode-dropdown-menu" style="display: none; position: absolute; bottom: 100%; right: 0; margin-bottom: 8px; background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.12); border: 1px solid #e2e8f0; width: 140px; z-index: 1000; overflow: hidden;">
                            <div onclick="setChatMode('translator'); toggleModeDropdown();" style="padding: 10px 14px; display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-family: 'Cairo', sans-serif; background: ${currentChatMode === 'translator' ? '#fff5f5' : 'white'}; color: ${currentChatMode === 'translator' ? '#800020' : '#2d3748'}; font-weight: ${currentChatMode === 'translator' ? 'bold' : 'normal'};">
                                <i class="fas fa-language"></i> Translator
                            </div>
                            <div onclick="setChatMode('teacher'); toggleModeDropdown();" style="padding: 10px 14px; display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-family: 'Cairo', sans-serif; background: ${currentChatMode === 'teacher' ? '#fff5f5' : 'white'}; color: ${currentChatMode === 'teacher' ? '#800020' : '#2d3748'}; font-weight: ${currentChatMode === 'teacher' ? 'bold' : 'normal'};">
                                <i class="fas fa-chalkboard-teacher"></i> Teacher
                            </div>
                        </div>
                    </div>
                    <button class="icon-btn" onclick="triggerImageUpload()"><i class="fas fa-camera"></i></button>
                    <button class="icon-btn" id="mic-btn" onclick="toggleVoiceRecording()"><i class="fas fa-microphone"></i></button>
                    <input type="text" id="chat-input" placeholder="Type here..." onkeypress="if(event.key === 'Enter') sendMessage()">
                    <button class="send-btn-poly" onclick="sendMessage()"><i class="fas fa-paper-plane"></i></button>
                </div>
                <div class="chat-counters">
                    <span class="counter-item">Messages: ${usage.text}/20</span>
                    <span class="counter-item">Images: ${usage.images}/3</span>
                    <span class="counter-item">Voice: ${usage.voice}/3</span>
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
        showToast("You have used all 3 image requests for today. Please try again tomorrow.");
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
        ${type === 'image' ? `<img src="${src}" class="preview-thumb">` : '<i class="fas fa-volume-up"></i> Audio recording ready'}
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
        showToast("You have used all 3 voice requests for today. Please try again tomorrow.");
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
            if (input) input.placeholder = "Type here...";
        };

        mediaRecorder.start();
        micBtn.classList.add('recording-active');
        showToast("🎙️ Recording... (maximum 30 seconds)");
        
        recordingInterval = setInterval(() => {
            recordingTime++;
            const input = document.getElementById('chat-input');
            if (input) input.placeholder = `Recording (${recordingTime} seconds)...`;
            if (recordingTime >= 30) {
                toggleVoiceRecording();
            }
        }, 1000);

    } catch (err) {
        showToast("Microphone permission is required to record audio.");
    }
}

async function sendMessage() {
    const input = document.getElementById('chat-input');
    const text = input ? input.value.trim() : '';
    if ((!text && !selectedImage && !selectedAudio) || isChatSending) return;

    const usage = getDailyUsage();
    const reservation = await reserveDailyUsage({
        text: 1,
        images: selectedImage ? 1 : 0,
        voice: selectedAudio ? 1 : 0
    });
    if (!reservation.ok) {
        showToast(reservation.error || 'Daily usage limit reached.');
        renderView();
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
            chatMessages.push({ role: 'ai', content: 'Sorry, something went wrong. Please try again.' });
        }
    } catch (err) {
        chatMessages.push({ role: 'ai', content: 'Sorry, I cannot connect to the server right now.' });
    } finally {
        isChatSending = false;
        isTyping = false;
        renderView();
    }
}
