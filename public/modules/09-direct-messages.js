/* Polyglots current site — 09-direct-messages.js. Keep this file as a classic script; inline handlers in the existing HTML depend on its global functions. */

// Real-time Messaging Functions
window.chatMessageCache = window.chatMessageCache || {};
let currentForwardMessageId = null;

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
            { name: "Assistant", username: "frau_farida" },
            { name: "Assistant 2", username: "frau_rawan" }
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
            window.chatMessageCache = {};
            snapshot.forEach(doc => {
                const message = { id: doc.id, ...doc.data() };
                messagesArray.push(message);
                window.chatMessageCache[doc.id] = message;
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

                const messageActions = !msg.isDeletedForEveryone ? `
                    <div class="message-actions">
                        <button class="message-action-btn forward-msg-btn" onclick="forwardMessagePrompt('${msg.id}')" title="إعادة توجيه الرسالة" aria-label="إعادة توجيه الرسالة">
                            <i class="fas fa-share"></i>
                        </button>
                        <button class="message-action-btn delete-msg-btn" onclick="deleteMessagePrompt('${msg.id}', ${isSent})" title="حذف الرسالة" aria-label="حذف الرسالة">
                            <i class="fas fa-trash"></i>
                        </button>
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
                        ${messageActions}
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

function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    }[char]));
}

function formatTextWithLinks(text) {
    if (!text) return '';
    const escapedText = escapeHtml(text);
    const urlRegex = /(https?:\/\/[^\s<]+)/gi;
    return escapedText.replace(urlRegex, (url) => {
        const cleanUrl = url.replace(/[.,!?؛،。]+$/g, '');
        const trailing = url.slice(cleanUrl.length);
        return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="chat-link">${cleanUrl}</a>${trailing}`;
    }).replace(/\n/g, '<br>');
}

// --- Forward Message Logic ---

function getForwardRecipients() {
    const authData = JSON.parse(localStorage.getItem('polyglots_auth_data') || '{}');
    if (authData.isAdmin) {
        return (authData.studentsList || []).map(username => ({ username, name: username }));
    }
    return [
        { username: 'يوسف', name: 'Polyglots Academy' },
        { username: 'فراو', name: 'Frau Hadeel' },
        { username: 'frau_farida', name: 'Assistant' },
        { username: 'frau_rawan', name: 'Assistant 2' }
    ];
}

function forwardMessagePrompt(messageId) {
    const message = window.chatMessageCache && window.chatMessageCache[messageId];
    const modal = document.getElementById('forward-modal');
    const list = document.getElementById('forward-recipients-list');
    if (!message || !modal || !list) return;

    currentForwardMessageId = messageId;
    const recipients = getForwardRecipients();
    list.innerHTML = recipients.length ? recipients.map(recipient => `
        <label class="forward-recipient">
            <input type="checkbox" name="forward-recipient" value="${escapeHtml(recipient.username)}">
            <span>${escapeHtml(recipient.name)}</span>
        </label>
    `).join('') : '<p class="forward-empty">لا يوجد مستلمون متاحون.</p>';
    modal.style.display = 'block';
}

function closeForwardModal() {
    const modal = document.getElementById('forward-modal');
    if (modal) modal.style.display = 'none';
    currentForwardMessageId = null;
}

function toggleAllForwardRecipients(checkbox) {
    document.querySelectorAll('input[name="forward-recipient"]').forEach(input => {
        input.checked = checkbox.checked;
    });
}

async function confirmForwardMessage() {
    const message = window.chatMessageCache && window.chatMessageCache[currentForwardMessageId];
    const selected = Array.from(document.querySelectorAll('input[name="forward-recipient"]:checked')).map(input => input.value);
    if (!message || !currentUser || !selected.length) {
        alert('اختر مستلماً واحداً على الأقل لإعادة توجيه الرسالة.');
        return;
    }

    const forwardButton = document.getElementById('confirm-forward-btn');
    if (forwardButton) forwardButton.disabled = true;
    try {
        const batch = db.batch();
        selected.forEach(receiver => {
            const messageRef = db.collection('messages').doc();
            const forwardedMessage = {
                chatId: getChatId(currentUser.username, receiver),
                sender: currentUser.username,
                receiver,
                isRead: false,
                forwarded: true,
                forwardedFrom: message.sender || '',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };
            if (message.type === 'image' || message.type === 'audio') {
                forwardedMessage.type = message.type;
                forwardedMessage.mediaData = message.mediaData;
            } else {
                forwardedMessage.type = 'text';
                forwardedMessage.text = message.text || '';
            }
            batch.set(messageRef, forwardedMessage);
        });
        await batch.commit();
        closeForwardModal();
        alert(`تمت إعادة توجيه الرسالة إلى ${selected.length} مستلم.`);
    } catch (error) {
        console.error('Forward message error:', error);
        alert('تعذر إعادة توجيه الرسالة. حاول مرة أخرى.');
    } finally {
        if (forwardButton) forwardButton.disabled = false;
    }
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
