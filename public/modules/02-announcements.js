/* Polyglots current site — 02-announcements.js. Keep this file as a classic script; inline handlers in the existing HTML depend on its global functions. */

function escapeAnnouncementHtml(value) {
    return String(value || '').replace(/[&<>\"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#039;'
    }[char]));
}

function formatAnnouncementDate(data) {
    const rawDate = data && data.createdAt && typeof data.createdAt.toDate === 'function'
        ? data.createdAt.toDate()
        : (data && data.createdAtMs ? new Date(data.createdAtMs) : new Date());
    return rawDate.toLocaleString('ar-EG', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

async function getAnnouncementsForUser(username, includeAll = false) {
    const query = includeAll
        ? db.collection('announcements')
        : db.collection('announcements').where('recipients', 'array-contains', username);
    const snapshot = await query.get();
    return snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
}

async function sendAnnouncement() {
    if (!currentUser || currentUser.username !== 'يوسف') {
        showToast('ليس لديك صلاحية إرسال إعلان.', 'error');
        return;
    }

    const messageInput = document.getElementById('announcement-message');
    const selectedRecipients = [...document.querySelectorAll('input[name="announcement-recipient"]:checked')]
        .map(input => input.value);
    const message = messageInput ? messageInput.value.trim() : '';

    if (!selectedRecipients.length) {
        showToast('اختار مستخدمًا واحدًا على الأقل لاستقبال الرسالة.', 'error');
        return;
    }
    if (!message) {
        showToast('اكتب نص الإعلان أولًا.', 'error');
        return;
    }

    const sendButton = document.getElementById('send-announcement-btn');
    if (sendButton) {
        sendButton.disabled = true;
        sendButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';
    }

    try {
        await db.collection('announcements').add({
            message,
            recipients: selectedRecipients,
            sender: currentUser.username,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdAtMs: Date.now()
        });
        showToast('تم إرسال الإعلان بنجاح.', 'success');
        renderAnnouncementView(document.getElementById('main-content'));
    } catch (error) {
        console.error('Error sending announcement:', error);
        showToast('تعذر إرسال الإعلان. تأكد من اتصال Firebase وقواعد Firestore.', 'error');
        if (sendButton) {
            sendButton.disabled = false;
            sendButton.innerHTML = '<i class="fas fa-paper-plane"></i> إرسال الإعلان';
        }
    }
}

function toggleAnnouncementRecipients(checked) {
    document.querySelectorAll('input[name="announcement-recipient"]').forEach(input => {
        input.checked = checked;
    });
}

async function renderAnnouncementView(container) {
    if (!currentUser) {
        container.innerHTML = '<div class="announcement-empty">Please login to see announcements.</div>';
        return;
    }

    const isYoussef = currentUser.username === 'يوسف';
    const authData = JSON.parse(localStorage.getItem('polyglots_auth_data') || '{}');
    const recipients = Array.isArray(authData.studentsList)
        ? authData.studentsList.filter(username => username !== currentUser.username)
        : [];

    container.innerHTML = `
        <section class="announcement-view" dir="rtl">
            <div class="announcement-heading">
                <div>
                    <span class="announcement-kicker">Polyglots Academy</span>
                    <h2><i class="fas fa-bullhorn"></i> Announcement</h2>
                    <p>${isYoussef ? 'أنشئ إعلانًا وحدد الطلاب الذين سيصلهم.' : 'الإعلانات المرسلة إليك من إدارة الأكاديمية.'}</p>
                </div>
            </div>
            ${isYoussef ? `
                <div class="announcement-composer">
                    <div class="announcement-composer-header">
                        <h3><i class="fas fa-pen"></i> إرسال إعلان جديد</h3>
                        <span>${recipients.length} مستخدمًا متاحًا</span>
                    </div>
                    <div class="announcement-recipient-toolbar">
                        <label><input type="checkbox" onchange="toggleAnnouncementRecipients(this.checked)"> تحديد الكل</label>
                        <span>اختر المستقبلين</span>
                    </div>
                    <div class="announcement-recipient-list">
                        ${recipients.length ? recipients.map(username => `
                            <label class="announcement-recipient">
                                <input type="checkbox" name="announcement-recipient" value="${escapeAnnouncementHtml(username)}">
                                <span>${escapeAnnouncementHtml(username)}</span>
                            </label>
                        `).join('') : '<p class="announcement-muted">لم يتم تحميل قائمة المستخدمين من تسجيل الدخول بعد.</p>'}
                    </div>
                    <textarea id="announcement-message" class="announcement-textarea" rows="5" placeholder="اكتب رسالة الإعلان هنا..."></textarea>
                    <button id="send-announcement-btn" class="announcement-send-btn" onclick="sendAnnouncement()"><i class="fas fa-paper-plane"></i> إرسال الإعلان</button>
                </div>
            ` : ''}
            <div class="announcement-list" id="announcement-list">
                <div class="announcement-loading"><i class="fas fa-spinner fa-spin"></i> جاري تحميل الإعلانات...</div>
            </div>
        </section>
    `;

    try {
        const announcements = await getAnnouncementsForUser(currentUser.username, isYoussef);
        const list = document.getElementById('announcement-list');
        if (!list) return;
        list.innerHTML = announcements.length ? announcements.map(item => `
            <article class="announcement-card">
                <div class="announcement-card-icon"><i class="fas fa-bullhorn"></i></div>
                <div class="announcement-card-content">
                    <div class="announcement-card-meta">
                        <span><i class="far fa-calendar-alt"></i> ${escapeAnnouncementHtml(formatAnnouncementDate(item))}</span>
                        <span><i class="fas fa-user"></i> ${escapeAnnouncementHtml(item.sender || 'Polyglots Academy')}</span>
                    </div>
                    <p>${escapeAnnouncementHtml(item.message).replace(/\n/g, '<br>')}</p>
                </div>
            </article>
        `).join('') : '<div class="announcement-empty"><i class="far fa-bell-slash"></i><p>لا توجد إعلانات حتى الآن.</p></div>';
    } catch (error) {
        console.error('Error loading announcements:', error);
        const list = document.getElementById('announcement-list');
        if (list) list.innerHTML = '<div class="announcement-empty error"><i class="fas fa-exclamation-triangle"></i><p>تعذر تحميل الإعلانات. تأكد من إعدادات Firebase.</p></div>';
    }
}
