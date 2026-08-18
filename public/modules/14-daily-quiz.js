let activeDailyQuiz = null;
let dailyQuizAttempt = null;

async function loadDailyQuizForStudent() {
    if (!currentUser) return null;
    const today = new Date().toISOString().slice(0, 10);
    try {
        const snapshot = await db.collection('dailyQuizzes').where('date', '==', today).where('published', '==', true).limit(5).get();
        const candidates = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(item => item.audience === 'all' || (item.recipients || []).includes(currentUser.username));
        activeDailyQuiz = candidates[0] || null;
        if (activeDailyQuiz) {
            const attempt = await db.collection('dailyQuizAttempts').doc(`${currentUser.username}_${today}`).get();
            dailyQuizAttempt = attempt.exists ? attempt.data() : null;
        }
        return activeDailyQuiz;
    } catch (error) {
        console.error('Daily quiz load failed:', error);
        activeDailyQuiz = null;
        return null;
    }
}

async function renderDailyQuizView(main) {
    main.innerHTML = '<section class="daily-quiz-view"><div class="admin-loading"><i class="fas fa-spinner fa-spin"></i> Loading Today Quiz...</div></section>';
    await loadDailyQuizForStudent();
    if (!activeDailyQuiz) { main.innerHTML = '<section class="daily-quiz-view"><div class="admin-empty"><i class="fas fa-calendar-check"></i><h2>No quiz available today</h2><p>A quiz will appear here when the academy publishes one.</p></div></section>'; return; }
    if (dailyQuizAttempt) { main.innerHTML = `<section class="daily-quiz-view"><div class="daily-quiz-card"><span class="daily-kicker">Today Quiz</span><h1>${escapeDaily(activeDailyQuiz.title || 'Today Quiz')}</h1><div class="daily-result">Your score: <strong>${Number(dailyQuizAttempt.score || 0)} / 1000</strong><p>Your one attempt for today has been used.</p></div></div></section>`; return; }
    const questions = Array.isArray(activeDailyQuiz.questions) ? activeDailyQuiz.questions : [];
    main.innerHTML = `<section class="daily-quiz-view"><div class="daily-quiz-card"><span class="daily-kicker">Today Quiz</span><h1>${escapeDaily(activeDailyQuiz.title || 'Today Quiz')}</h1><p>You have one attempt. Your score is calculated as a percentage out of 1000 points.</p><form id="daily-quiz-form">${questions.map((question, index) => `<fieldset class="daily-question"><legend>${index + 1}. ${escapeDaily(question.question || '')}</legend>${(question.options || []).map((option, optionIndex) => `<label><input type="radio" name="q${index}" value="${optionIndex}" required> ${escapeDaily(option)}</label>`).join('')}</fieldset>`).join('')}<button class="admin-save" type="submit">Submit quiz</button></form></div></section>`;
    document.getElementById('daily-quiz-form').addEventListener('submit', submitDailyQuiz);
}

async function submitDailyQuiz(event) {
    event.preventDefault();
    if (!activeDailyQuiz || !currentUser) return;
    const questions = Array.isArray(activeDailyQuiz.questions) ? activeDailyQuiz.questions : [];
    const answers = questions.map((_, index) => Number(new FormData(event.target).get(`q${index}`)));
    const correct = questions.reduce((total, question, index) => total + (answers[index] === Number(question.answer) ? 1 : 0), 0);
    const score = questions.length ? Math.round((correct / questions.length) * 1000) : 0;
    const today = new Date().toISOString().slice(0, 10);
    const attempt = { username: currentUser.username, quizId: activeDailyQuiz.id, date: today, score, correct, total: questions.length, answers, submittedAt: firebase.firestore.FieldValue.serverTimestamp() };
    try {
        const attemptRef = db.collection('dailyQuizAttempts').doc(`${currentUser.username}_${today}`);
        await db.runTransaction(async transaction => {
            const existing = await transaction.get(attemptRef);
            if (existing.exists) throw new Error('ATTEMPT_ALREADY_USED');
            transaction.set(attemptRef, attempt);
        });
        dailyQuizAttempt = attempt;
        if (score > 0 && typeof awardPoints === 'function') await awardPoints(Math.round(score));
        renderDailyQuizView(document.getElementById('main-content'));
    } catch (error) {
        console.error('Daily quiz submit failed:', error);
        if (typeof showToast === 'function') showToast(error.message === 'ATTEMPT_ALREADY_USED' ? 'Your one attempt for today has already been used.' : 'Could not save the quiz result.', 'error');
    }
}

function escapeDaily(value) { return String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char])); }
window.renderDailyQuizView = renderDailyQuizView;
