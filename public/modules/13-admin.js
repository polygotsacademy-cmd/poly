/* Yusuf-only administration view. Profile fields are stored in Firestore users/{username}. */

let adminStudents = [];
let adminFilter = '';
let dailyQuizDraft = [];
let dailyQuizEditId = null;
let adminDailyQuizzes = [];

function isYusufAdmin() {
    return Boolean(currentUser && currentUser.username === 'يوسف' && currentUser.isAdmin === true);
}

function adminProfileDefaults(username) {
    return {
        username,
        displayName: username,
        chatName: username,
        active: true,
        aiEnabled: true,
        visibleSections: ['words', 'stories', 'quizzes', 'pronunciation', 'games', 'chat', 'messages', 'leaderboard'],
        points: 0,
        lastSeen: null,
        testResults: {}
    };
}

function formatLastSeen(value) {
    if (!value) return 'لم يظهر بعد';
    const date = value.toDate ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return 'غير معروف';
    const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
    return minutes === 0 ? 'الآن' : `منذ ${minutes} دقيقة`;
}

function escapeAdminHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
}

function adminSectionsHtml(selected = []) {
    const sections = [['words','الكلمات'],['stories','القصص'],['quizzes','الاختبارات'],['pronunciation','النطق'],['games','الألعاب'],['chat','Polyglots AI'],['messages','Poly chat'],['leaderboard','لوحة الشرف']];
    return sections.map(([key, label]) => `<label class="admin-check"><input type="checkbox" data-section="${key}" ${selected.includes(key) ? 'checked' : ''}> ${label}</label>`).join('');
}

async function loadAdminStudents() {
    if (!isYusufAdmin()) return [];
    const usernames = (currentUser.studentsList || []).filter(username => username !== 'يوسف');
    const profiles = await Promise.all(usernames.map(async username => {
        try {
            const doc = await db.collection('users').doc(username).get();
            return { ...adminProfileDefaults(username), ...(doc.exists ? doc.data() : {}) };
        } catch (error) {
            console.error('Admin profile load failed:', username, error);
            return adminProfileDefaults(username);
        }
    }));
    adminStudents = profiles;
    return profiles;
}

function renderAdminView(main) {
    if (!isYusufAdmin()) {
        main.innerHTML = '<section class="admin-denied"><i class="fas fa-lock"></i><h2>غير مصرح</h2><p>هذه الصفحة متاحة ليوسف فقط.</p></section>';
        return;
    }
    main.innerHTML = `<section class="admin-shell">
        <div class="admin-heading"><div><span class="admin-kicker">إدارة الأكاديمية</span><h1>لوحة التحكم</h1><p>إدارة الطلاب والصلاحيات والنتائج من مكان واحد.</p></div><div class="admin-heading-actions"><button class="admin-add-student" onclick="openNewStudentModal()"><i class="fas fa-user-plus"></i> إضافة طالب</button><button class="admin-refresh" onclick="renderAdminView(document.getElementById('main-content'))"><i class="fas fa-sync-alt"></i> تحديث</button></div></div>
        <div class="admin-tabs"><button class="admin-tab active" data-admin-tab="students" onclick="switchAdminTab('students')"><i class="fas fa-users"></i> إدارة الطلاب</button><button class="admin-tab" data-admin-tab="content" onclick="switchAdminTab('content')"><i class="fas fa-layer-group"></i> إدارة المحتوى</button></div>
        <div id="admin-panel-body"><div class="admin-loading"><i class="fas fa-spinner fa-spin"></i> جاري تحميل بيانات الطلاب...</div></div>
    </section>`;
    loadAdminStudents().then(renderAdminStudentsPanel).catch(error => {
        console.error(error);
        const panel = document.getElementById('admin-panel-body');
        if (panel) panel.innerHTML = '<div class="admin-empty">تعذر تحميل بيانات الطلاب. تحقق من اتصال Firebase وقواعد Firestore.</div>';
    });
}

function renderAdminStudentsPanel() {
    const panel = document.getElementById('admin-panel-body');
    if (!panel) return;
    const filtered = adminStudents.filter(student => `${student.username} ${student.displayName || ''} ${student.chatName || ''}`.toLowerCase().includes(adminFilter.toLowerCase()));
    panel.innerHTML = `<div class="admin-toolbar"><div class="admin-stat"><strong>${adminStudents.length}</strong><span>طالبًا</span></div><input class="admin-search" value="${escapeAdminHtml(adminFilter)}" oninput="adminFilter=this.value; renderAdminStudentsPanel()" placeholder="ابحث باسم المستخدم أو الاسم الظاهر..."></div>
    <div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>المستخدم</th><th>الاسم الظاهر</th><th>آخر ظهور</th><th>النقاط</th><th>الحالة</th><th>Polyglots AI</th><th>الأقسام</th><th>إجراء</th></tr></thead><tbody>${filtered.length ? filtered.map(adminStudentRow).join('') : '<tr><td colspan="8" class="admin-empty">لا توجد نتائج مطابقة.</td></tr>'}</tbody></table></div>`;
}

function adminStudentRow(student) {
    const sectionsCount = Array.isArray(student.visibleSections) ? student.visibleSections.length : 0;
    return `<tr><td><strong>${escapeAdminHtml(student.username)}</strong><small>${escapeAdminHtml(student.chatName || student.username)}</small></td><td>${escapeAdminHtml(student.displayName || student.username)}</td><td>${formatLastSeen(student.lastSeen)}</td><td>${Number(student.points || 0)} XP</td><td><span class="status-pill ${student.active === false ? 'off' : 'on'}">${student.active === false ? 'متوقف' : 'نشط'}</span></td><td><span class="status-pill ${student.aiEnabled === false ? 'off' : 'on'}">${student.aiEnabled === false ? 'متوقف' : 'مفعل'}</span></td><td>${sectionsCount} أقسام</td><td><button class="admin-edit-btn" onclick="openStudentEditor('${encodeURIComponent(student.username)}')"><i class="fas fa-pen"></i> تعديل</button></td></tr>`;
}

function openStudentEditor(encodedUsername) {
    const username = decodeURIComponent(encodedUsername);
    const student = adminStudents.find(item => item.username === username);
    if (!student) return;
    const modal = document.createElement('div');
    modal.className = 'admin-modal-backdrop';
    modal.id = 'admin-student-modal';
    modal.innerHTML = `<div class="admin-modal"><button class="admin-modal-close" onclick="closeStudentEditor()">&times;</button><h2>تعديل بيانات الطالب</h2><p class="admin-modal-subtitle">${escapeAdminHtml(username)} — لا يتم عرض كلمة المرور الحالية.</p><form id="student-edit-form" onsubmit="saveStudentEditor(event, '${encodeURIComponent(username)}')"><div class="admin-form-grid"><label>الاسم الظاهر<input name="displayName" value="${escapeAdminHtml(student.displayName || username)}"></label><label>اسم الشات<input name="chatName" value="${escapeAdminHtml(student.chatName || student.displayName || username)}"></label><label>النقاط<input name="points" type="number" min="0" value="${Number(student.points || 0)}"></label><label>كلمة مرور جديدة<input name="newPassword" type="password" minlength="4" placeholder="سيتم تفعيلها عبر نشر آمن لاحقًا"></label></div><label class="admin-results-label">نتائج الاختبارات (JSON قابل للتعديل)<textarea name="testResults" rows="5">${escapeAdminHtml(JSON.stringify(student.testResults || {}, null, 2))}</textarea></label><div class="admin-switches"><label class="admin-switch"><input name="active" type="checkbox" ${student.active !== false ? 'checked' : ''}><span>السماح بالدخول</span></label><label class="admin-switch"><input name="aiEnabled" type="checkbox" ${student.aiEnabled !== false ? 'checked' : ''}><span>السماح باستخدام Polyglots AI</span></label></div><h3>الأقسام المتاحة</h3><div class="admin-sections-grid">${adminSectionsHtml(Array.isArray(student.visibleSections) ? student.visibleSections : [])}</div><div class="admin-editor-actions"><button type="button" class="admin-cancel" onclick="closeStudentEditor()">إلغاء</button><button type="submit" class="admin-save">حفظ التعديلات</button></div></form></div>`;
    document.body.appendChild(modal);
}

function openNewStudentModal() {
    if (!isYusufAdmin()) return;
    const modal = document.createElement('div'); modal.className = 'admin-modal-backdrop'; modal.id = 'admin-new-student-modal';
    modal.innerHTML = `<div class="admin-modal"><button class="admin-modal-close" onclick="closeNewStudentModal()">&times;</button><h2>إضافة طالب جديد</h2><p class="admin-modal-subtitle">سيصبح الحساب فعالًا بعد Commit وإعادة نشر Vercel.</p><form onsubmit="saveNewStudent(event)"><div class="admin-form-grid"><label>اسم المستخدم<input name="username" required minlength="3" maxlength="40" pattern="[-_\\p{L}\\p{N}]+" placeholder="student_01"></label><label>كلمة المرور<input name="password" type="password" required minlength="4"></label><label>الاسم الظاهر<input name="displayName" placeholder="اسم الطالب"></label><label>النقاط الابتدائية<input name="points" type="number" min="0" value="0"></label></div><div class="admin-switches"><label class="admin-switch"><input name="aiEnabled" type="checkbox" checked><span>السماح بـ Polyglots AI</span></label></div><h3>الأقسام المتاحة</h3><div class="admin-sections-grid">${adminSectionsHtml(['words','stories','quizzes','pronunciation','games','chat','messages','leaderboard'])}</div><div class="admin-editor-actions"><button type="button" class="admin-cancel" onclick="closeNewStudentModal()">إلغاء</button><button type="submit" class="admin-save">إنشاء الطالب</button></div></form></div>`;
    document.body.appendChild(modal);
}
function closeNewStudentModal() { document.getElementById('admin-new-student-modal')?.remove(); }
async function saveNewStudent(event) {
    event.preventDefault(); const form = event.target;
    const visibleSections = [...form.querySelectorAll('[data-section]:checked')].map(input => input.dataset.section);
    const payload = { username: form.username.value.trim(), password: form.password.value, displayName: form.displayName.value.trim() || form.username.value.trim(), aiEnabled: form.aiEnabled.checked, visibleSections };
    try {
        const response = await fetch('/api/create-student', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(payload) });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || 'تعذر إنشاء الطالب');
        closeNewStudentModal(); showToast('تم إنشاء الطالب ورفع السجل إلى GitHub. سيعمل الحساب بعد إعادة نشر Vercel.', 'success');
    } catch (error) { console.error('Student creation failed:', error); showToast(error.message || 'تعذر إنشاء الطالب.', 'error'); }
}

function closeStudentEditor() { document.getElementById('admin-student-modal')?.remove(); }

async function saveStudentEditor(event, encodedUsername) {
    event.preventDefault();
    const username = decodeURIComponent(encodedUsername);
    const student = adminStudents.find(item => item.username === username);
    const form = event.target;
    const visibleSections = [...form.querySelectorAll('[data-section]:checked')].map(input => input.dataset.section);
    const updates = { displayName: form.displayName.value.trim() || username, chatName: form.chatName.value.trim() || username, points: Math.max(0, Number(form.points.value || 0)), active: form.active.checked, aiEnabled: form.aiEnabled.checked, visibleSections, updatedAt: firebase.firestore.FieldValue.serverTimestamp(), updatedBy: 'يوسف' };
    let passwordChanged = false;
    let parsedResults = {};
    try { parsedResults = JSON.parse(form.testResults.value || '{}'); } catch { if (typeof showToast === 'function') showToast('صيغة نتائج الاختبارات غير صحيحة.', 'error'); return; }
    updates.testResults = parsedResults;
    try {
        if (form.newPassword.value.trim()) {
            const passwordResponse = await fetch('/api/admin-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ username, newPassword: form.newPassword.value.trim() }) });
            const passwordData = await passwordResponse.json();
            if (!passwordResponse.ok || !passwordData.success) throw new Error(passwordData.error || 'تعذر تغيير كلمة المرور');
            passwordChanged = true;
        }
        await db.collection('users').doc(username).set(updates, { merge: true });
        Object.assign(student, updates);
        closeStudentEditor();
        renderAdminStudentsPanel();
        if (typeof showToast === 'function') showToast(passwordChanged ? 'تم حفظ البيانات ورفع تغيير كلمة المرور. سيعمل بعد نشر Vercel.' : 'تم حفظ تعديلات الطالب.', 'success');
    } catch (error) {
        console.error('Student update failed:', error);
        if (typeof showToast === 'function') showToast('تعذر حفظ التعديلات. تحقق من قواعد Firestore.', 'error');
    }
}

function contentAudienceFields() {
    const users = (currentUser?.studentsList || []).filter(username => username !== 'يوسف');
    return `<label>من يرى المحتوى؟<select name="audience"><option value="all">الجميع</option><option value="selected">مستخدمون محددون</option></select></label><label class="content-recipients">المستخدمون المحددون<select name="recipients" multiple>${users.map(username => `<option value="${escapeAdminHtml(username)}">${escapeAdminHtml(username)}</option>`).join('')}</select></label>`;
}

function renderAdminContentPanel(section = 'categories') {
    const panel = document.getElementById('admin-panel-body');
    if (!panel) return;
    const tabs = [['categories','التصنيفات والكلمات','fa-tags'],['stories','القصص','fa-book-open'],['daily','اختبار اليوم','fa-calendar-check']];
    panel.innerHTML = `<div class="content-subtabs">${tabs.map(([key,label,icon]) => `<button class="content-subtab ${key === section ? 'active' : ''}" onclick="renderAdminContentPanel('${key}')"><i class="fas ${icon}"></i> ${label}</button>`).join('')}</div><div id="content-editor-area"></div>`;
    if (section === 'categories') renderCategoryWordEditor();
    if (section === 'stories') renderStoryEditor();
    if (section === 'daily') renderDailyQuizEditor();
}

function renderCategoryWordEditor() {
    document.getElementById('content-editor-area').innerHTML = `<div class="content-editor-card"><h2>إضافة تصنيف أو كلمة</h2><p>تُحفظ البيانات الجديدة في Firestore، بينما تبقى ملفات JSON الحالية كنسخة احتياطية.</p><form onsubmit="saveAdminContent(event, 'category')"><div class="admin-form-grid"><label>اسم التصنيف<input name="category" required placeholder="Familie"></label><label>رمز أو Emoji<input name="categoryEmoji" placeholder="👨‍👩‍👧‍👦"></label></div><button class="admin-save" type="submit">حفظ التصنيف</button></form><hr><form onsubmit="saveAdminContent(event, 'word')"><div class="admin-form-grid"><label>التصنيف<input name="category" required placeholder="Familie"></label><label>الكلمة الألمانية<input name="word" required placeholder="Vater"></label><label>الترجمة العربية<input name="arabic" required placeholder="أب"></label><label>الجمع<input name="plural" placeholder="Väter"></label><label>الصوت (رابط GitHub حالي)<input name="audio" placeholder="audio/words/word_123.mp3"></label><label>رفع صوت جديد<input name="audioFile" type="file" accept="audio/mpeg,audio/wav,audio/mp4,audio/webm"></label><label>الصورة أو Emoji<input name="emoji" placeholder="👨"></label></div>${contentAudienceFields()}<button class="admin-save" type="submit">حفظ الكلمة</button></form></div>`;
}

function renderStoryEditor() {
    document.getElementById('content-editor-area').innerHTML = `<div class="content-editor-card"><h2>إضافة قصة</h2><form onsubmit="saveAdminContent(event, 'story')"><div class="admin-form-grid"><label>عنوان القصة<input name="title" required></label><label>المستوى<input name="level" placeholder="A1"></label><label class="content-wide">النص الألماني<textarea name="text" rows="6" required></textarea></label><label class="content-wide">الترجمة العربية<textarea name="translation" rows="6"></textarea></label><label>الصوت (رابط GitHub حالي)<input name="audio"></label><label>رفع صوت جديد<input name="audioFile" type="file" accept="audio/mpeg,audio/wav,audio/mp4,audio/webm"></label><label>صورة الغلاف<input name="image"></label><label>رفع صورة جديدة<input name="imageFile" type="file" accept="image/png,image/jpeg,image/webp"></label></div>${contentAudienceFields()}<button class="admin-save" type="submit">حفظ القصة</button></form></div>`;
}

function emptyDailyQuestion() { return { question: '', options: ['', '', '', ''], answer: 0 }; }

function renderDailyQuizEditor(editQuiz = null) {
    dailyQuizEditId = editQuiz?.id || null;
    dailyQuizDraft = Array.isArray(editQuiz?.questions) && editQuiz.questions.length
        ? editQuiz.questions.map(question => ({ question: question.question || '', options: Array.isArray(question.options) && question.options.length >= 2 ? [...question.options] : ['', '', '', ''], answer: Number.isInteger(Number(question.answer)) ? Number(question.answer) : 0 }))
        : [emptyDailyQuestion()];
    const area = document.getElementById('content-editor-area');
    area.innerHTML = `<div class="content-editor-card"><div class="daily-editor-heading"><div><h2>${editQuiz ? 'تعديل اختبار اليوم' : 'إضافة اختبار اليوم'}</h2><p>محاولة واحدة لكل طالب، والدرجة تحسب حسب نسبة الإجابات الصحيحة من 1000 نقطة.</p></div>${editQuiz ? '<button type="button" class="admin-cancel" onclick="renderDailyQuizEditor()">اختبار جديد</button>' : ''}</div><form id="daily-quiz-editor-form" data-edit-id="${editQuiz ? escapeAdminHtml(editQuiz.id) : ''}" onsubmit="saveAdminContent(event, 'daily')"><div class="admin-form-grid"><label>تاريخ الاختبار<input name="date" type="date" required value="${escapeAdminHtml(editQuiz?.date || '')}"></label><label>العنوان<input name="title" required placeholder="اختبار اليوم" value="${escapeAdminHtml(editQuiz?.title || '')}"></label></div><div class="daily-questions-heading"><h3>الأسئلة</h3><button type="button" class="admin-refresh" onclick="addDailyQuestion()">+ إضافة سؤال</button></div><div id="daily-question-list"></div>${contentAudienceFields()}<div class="admin-editor-actions"><button class="admin-save" type="submit">${editQuiz ? 'حفظ التعديلات' : 'حفظ الاختبار'}</button></div></form></div><div id="daily-quiz-list" class="admin-content-list"><div class="admin-loading">جاري تحميل الاختبارات...</div></div>`;
    renderDailyQuestionBuilder();
    loadAdminDailyQuizzes();
}

function renderDailyQuestionBuilder() {
    const list = document.getElementById('daily-question-list');
    if (!list) return;
    list.innerHTML = dailyQuizDraft.map((question, questionIndex) => `<fieldset class="daily-question-editor"><legend>السؤال ${questionIndex + 1}</legend><div class="daily-question-toolbar"><button type="button" class="admin-cancel" onclick="moveDailyQuestion(${questionIndex}, -1)" ${questionIndex === 0 ? 'disabled' : ''}>↑</button><button type="button" class="admin-cancel" onclick="moveDailyQuestion(${questionIndex}, 1)" ${questionIndex === dailyQuizDraft.length - 1 ? 'disabled' : ''}>↓</button><button type="button" class="admin-cancel" onclick="removeDailyQuestion(${questionIndex})" ${dailyQuizDraft.length === 1 ? 'disabled' : ''}>حذف السؤال</button></div><label>نص السؤال<input data-question type="text" value="${escapeAdminHtml(question.question)}" placeholder="مثال: ما معنى Haus؟" required></label><div class="daily-options-grid">${question.options.map((option, optionIndex) => `<label>الخيار ${optionIndex + 1}<input data-option="${optionIndex}" type="text" value="${escapeAdminHtml(option)}" placeholder="اكتب الخيار" required></label>`).join('')}</div><label>الإجابة الصحيحة<select data-answer>${question.options.map((option, optionIndex) => `<option value="${optionIndex}" ${optionIndex === Number(question.answer) ? 'selected' : ''}>الخيار ${optionIndex + 1}</option>`).join('')}</select></label></fieldset>`).join('');
}

function syncDailyQuestionDraft() {
    document.querySelectorAll('.daily-question-editor').forEach((card, index) => {
        if (!dailyQuizDraft[index]) return;
        dailyQuizDraft[index].question = card.querySelector('[data-question]')?.value || '';
        dailyQuizDraft[index].options = [...card.querySelectorAll('[data-option]')].map(input => input.value || '');
        dailyQuizDraft[index].answer = Number(card.querySelector('[data-answer]')?.value || 0);
    });
}

function addDailyQuestion() { syncDailyQuestionDraft(); dailyQuizDraft.push(emptyDailyQuestion()); renderDailyQuestionBuilder(); }
function removeDailyQuestion(index) { if (dailyQuizDraft.length <= 1) return; syncDailyQuestionDraft(); dailyQuizDraft.splice(index, 1); renderDailyQuestionBuilder(); }
function moveDailyQuestion(index, direction) { syncDailyQuestionDraft(); const target = index + direction; if (target < 0 || target >= dailyQuizDraft.length) return; [dailyQuizDraft[index], dailyQuizDraft[target]] = [dailyQuizDraft[target], dailyQuizDraft[index]]; renderDailyQuestionBuilder(); }

function collectDailyQuestions(form) {
    syncDailyQuestionDraft();
    const questions = dailyQuizDraft.map(question => ({ question: question.question.trim(), options: question.options.map(option => option.trim()), answer: Number(question.answer) }));
    if (!questions.length || questions.some(question => !question.question || question.options.length < 2 || question.options.some(option => !option) || question.answer < 0 || question.answer >= question.options.length)) throw new Error('أكمل نص كل سؤال وكل الخيارات وحدد إجابة صحيحة.');
    return questions;
}

async function loadAdminDailyQuizzes() {
    const list = document.getElementById('daily-quiz-list');
    if (!list || !isYusufAdmin()) return;
    try {
        const snapshot = await db.collection('dailyQuizzes').orderBy('date', 'desc').limit(50).get();
        adminDailyQuizzes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        list.innerHTML = adminDailyQuizzes.length ? `<h3>الاختبارات المحفوظة</h3>${adminDailyQuizzes.map(adminDailyQuizRow).join('')}` : '<div class="admin-empty">لا توجد اختبارات محفوظة بعد.</div>';
    } catch (error) { console.error('Daily quizzes load failed:', error); list.innerHTML = '<div class="admin-empty">تعذر تحميل الاختبارات المحفوظة.</div>'; }
}

function adminDailyQuizRow(quiz) {
    const audience = quiz.audience === 'selected' ? `${(quiz.recipients || []).length} مستخدمين` : 'الجميع';
    return `<div class="admin-content-row"><div><strong>${escapeAdminHtml(quiz.title || 'اختبار اليوم')}</strong><small>${escapeAdminHtml(quiz.date || 'بدون تاريخ')} · ${(quiz.questions || []).length} أسئلة · ${audience}</small></div><div class="admin-content-actions"><button class="admin-edit-btn" type="button" onclick="editDailyQuiz('${encodeURIComponent(quiz.id)}')">تعديل</button><button class="admin-delete-btn" type="button" onclick="deleteDailyQuiz('${encodeURIComponent(quiz.id)}')">حذف</button></div></div>`;
}

function editDailyQuiz(encodedId) { const quiz = adminDailyQuizzes.find(item => item.id === decodeURIComponent(encodedId)); if (quiz) renderDailyQuizEditor(quiz); }
async function deleteDailyQuiz(encodedId) { const id = decodeURIComponent(encodedId); if (!confirm('هل تريد حذف هذا الاختبار؟ لن يتم حذف نتائج الطلاب السابقة.')) return; try { await db.collection('dailyQuizzes').doc(id).delete(); showToast('تم حذف الاختبار.', 'success'); renderDailyQuizEditor(); } catch (error) { console.error(error); showToast('تعذر حذف الاختبار.', 'error'); } }

async function fileAsBase64(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = reject; reader.readAsDataURL(file); }); }
async function uploadAdminFile(file, folder) {
    if (!file) return '';
    if (file.size > 8 * 1024 * 1024) throw new Error('حجم الملف أكبر من 8MB');
    const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const result = await fetch('/api/github-upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ path: `public/${folder}/${safeName}`, contentBase64: await fileAsBase64(file), message: `Add academy asset ${safeName}` }) });
    const data = await result.json();
    if (!result.ok || !data.success) throw new Error(data.error || 'فشل رفع الملف');
    return data.publicUrl;
}

async function saveAdminContent(event, type) {
    event.preventDefault();
    if (!isYusufAdmin()) return;
    const form = event.target;
    const audience = form.audience?.value || 'all';
    const recipients = audience === 'selected' ? [...(form.recipients?.selectedOptions || [])].map(option => option.value) : [];
    const base = { audience, recipients, createdBy: 'يوسف', createdAt: firebase.firestore.FieldValue.serverTimestamp(), published: true };
    let collection = '';
    let payload = { ...base };
    if (type === 'category') { collection = 'contentCategories'; payload = { ...base, name: form.category.value.trim(), emoji: form.categoryEmoji.value.trim() }; }
    if (type === 'word') { collection = 'contentWords'; const uploadedAudio = await uploadAdminFile(form.audioFile?.files?.[0], 'audio/words'); payload = { ...base, cat: form.category.value.trim(), word: form.word.value.trim(), ar: form.arabic.value.trim(), pl: form.plural.value.trim(), audio: uploadedAudio || form.audio.value.trim(), emoji: form.emoji.value.trim() }; }
    if (type === 'story') { collection = 'contentStories'; const uploadedAudio = await uploadAdminFile(form.audioFile?.files?.[0], 'audio/stories'); const uploadedImage = await uploadAdminFile(form.imageFile?.files?.[0], 'images/stories'); payload = { ...base, title: form.title.value.trim(), level: form.level.value.trim(), text: form.text.value.trim(), translation: form.translation.value.trim(), audio: uploadedAudio || form.audio.value.trim(), image: uploadedImage || form.image.value.trim() }; }
    if (type === 'daily') { collection = 'dailyQuizzes'; try { payload.questions = collectDailyQuestions(form); } catch (error) { showToast(error.message, 'error'); return; } payload.date = form.date.value; payload.title = form.title.value.trim(); payload.maxPoints = 1000; payload.oneAttemptPerDay = true; }
    try { const editId = type === 'daily' ? form.dataset.editId : ''; if (editId) await db.collection(collection).doc(editId).set(payload, { merge: true }); else await db.collection(collection).add(payload); form.reset(); showToast(editId ? 'تم تحديث الاختبار.' : 'تم حفظ المحتوى في Firestore وبدء نشر الملفات إن وُجدت.', 'success'); if (type === 'daily') renderDailyQuizEditor(); } catch (error) { console.error('Content save failed:', error); showToast(error.message || 'تعذر حفظ المحتوى. تحقق من قواعد Firestore.', 'error'); }
}

function switchAdminTab(tab) {
    document.querySelectorAll('.admin-tab').forEach(button => button.classList.toggle('active', button.dataset.adminTab === tab));
    const panel = document.getElementById('admin-panel-body');
    if (!panel) return;
    if (tab === 'content') renderAdminContentPanel();
    else renderAdminStudentsPanel();
}

window.renderAdminView = renderAdminView;
window.renderAdminStudentsPanel = renderAdminStudentsPanel;
window.openStudentEditor = openStudentEditor;
window.openNewStudentModal = openNewStudentModal;
window.closeNewStudentModal = closeNewStudentModal;
window.saveNewStudent = saveNewStudent;
window.closeStudentEditor = closeStudentEditor;
window.saveStudentEditor = saveStudentEditor;
window.switchAdminTab = switchAdminTab;
window.renderAdminContentPanel = renderAdminContentPanel;
window.saveAdminContent = saveAdminContent;
window.renderDailyQuizEditor = renderDailyQuizEditor;
window.addDailyQuestion = addDailyQuestion;
window.removeDailyQuestion = removeDailyQuestion;
window.moveDailyQuestion = moveDailyQuestion;
window.editDailyQuiz = editDailyQuiz;
window.deleteDailyQuiz = deleteDailyQuiz;
