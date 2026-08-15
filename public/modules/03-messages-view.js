/* Polyglots current site — 03-messages-view.js. Keep this file as a classic script; inline handlers in the existing HTML depend on its global functions. */

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
            { name: "Assistant", username: "frau_farida" },
            { name: "Assistant 2", username: "frau_rawan" }
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
                    <div class="contact-item ${currentChatUser === c.username ? 'active' : ''}" data-username="${c.username}" onclick="selectChat('${c.username}')">
                        <div class="contact-avatar" id="avatar-${c.username}">${window.mascotCache[c.username] || c.name.charAt(0).toUpperCase()}</div>
                        <div class="contact-info">
                            <h4>${c.name}</h4>
                        </div>
                        <span class="contact-unread-badge" style="display:${unreadMessagesByUser[c.username] ? 'inline-flex' : 'none'}; width:10px; height:10px; margin-left:auto; background:#e53935; border-radius:50%; box-shadow:0 0 0 2px #fff;" title="رسالة غير مقروءة"></span>
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

    updateNotificationBadge();
}

// View Renderers
