/* Polyglots current site — 07-ai-chat.js. Keep this file as a classic script; inline handlers in the existing HTML depend on its global functions. */

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
