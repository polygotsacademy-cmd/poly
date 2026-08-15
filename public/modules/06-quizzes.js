/* Polyglots current site — 06-quizzes.js. Keep this file as a classic script; inline handlers in the existing HTML depend on its global functions. */

function renderQuizzesView(container) {
    if (selectedQuizCategory) {
        if (selectedQuizMode) {
            renderQuizMode(container);
        } else {
            renderQuizModesSelection(container);
        }
    } else {
        renderQuizCategorySelection(container);
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
                <div class="category-card" onclick="selectQuizCategory('${cat.name}')" style="background: white; border-radius: 15px; padding: 20px; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.05); cursor: pointer; transition: all 0.3s ease;">
                    <div class="cat-emoji" style="font-size: 40px; margin-bottom: 10px;">${cat.emoji}</div>
                    <div class="cat-name" style="font-weight: bold; color: #333; font-family: 'Cairo', sans-serif;">${cat.name}</div>
                    <div class="cat-count" style="font-size: 12px; color: #888; margin-top: 5px;">${words.filter(w => w.cat === cat.name).length} كلمة</div>
                </div>
            `).join('')}
        </div>
    `;
}

function selectQuizCategory(cat) {
    selectedQuizCategory = cat;
    selectedQuizMode = null;
    renderView();
}

function renderQuizModesSelection(container) {
    container.innerHTML = `
        <div class="quiz-modes-view" style="padding: 20px; text-align: center; animation: fadeIn 0.5s;">
            <button class="back-btn" onclick="selectedQuizCategory=null; renderView();" style="float: right; background: #eee; border: none; padding: 8px 15px; border-radius: 10px; cursor: pointer;"><i class="fas fa-arrow-left"></i> رجوع</button>
            <h2 style="font-family: 'Cairo', sans-serif; margin-bottom: 30px; clear: both;">اختر نمط الاختبار: ${selectedQuizCategory}</h2>
            
            <div class="modes-container" style="display: flex; flex-direction: column; gap: 20px; max-width: 400px; margin: 0 auto;">
                <div class="mode-card" onclick="startQuizMode('flashcards')" style="background: white; padding: 25px; border-radius: 20px; box-shadow: 0 5px 15px rgba(0,0,0,0.08); cursor: pointer; transition: transform 0.2s;">
                    <div style="font-size: 40px; margin-bottom: 10px;">🎴</div>
                    <h3 style="font-family: 'Cairo', sans-serif;">نمط الكروت (Flashcards)</h3>
                    <p style="font-size: 14px; color: #777;">كروت تظهر بالألمانية وتتقلب لتظهر المعنى بالعربي</p>
                </div>
                
                <div class="mode-card" onclick="startQuizMode('mcq')" style="background: white; padding: 25px; border-radius: 20px; box-shadow: 0 5px 15px rgba(0,0,0,0.08); cursor: pointer; transition: transform 0.2s;">
                    <div style="font-size: 40px; margin-bottom: 10px;">🎯</div>
                    <h3 style="font-family: 'Cairo', sans-serif;">اختيار من متعدد (MCQ)</h3>
                    <p style="font-size: 14px; color: #777;">اختر المعنى الصحيح من بين 4 اختيارات</p>
                </div>
                
                <div class="mode-card" onclick="startQuizMode('spelling')" style="background: white; padding: 25px; border-radius: 20px; box-shadow: 0 5px 15px rgba(0,0,0,0.08); cursor: pointer; transition: transform 0.2s;">
                    <div style="font-size: 40px; margin-bottom: 10px;">✍️</div>
                    <h3 style="font-family: 'Cairo', sans-serif;">نمط الكتابة (Spelling)</h3>
                    <p style="font-size: 14px; color: #777;">اكتب الكلمة بالألمانية بشكل صحيح</p>
                </div>
            </div>
        </div>
    `;
}

function startQuizMode(mode) {
    selectedQuizMode = mode;
    quizWords = words.filter(w => w.cat === selectedQuizCategory).sort(() => Math.random() - 0.5);
    currentQuizIndex = 0;
    quizScore = 0;
    quizAnswered = false;
    selectedAnswer = null;
    spellingInput = "";
    renderView();
}

function renderQuizMode(container) {
    if (currentQuizIndex >= quizWords.length) {
        renderQuizResult(container);
        return;
    }

    const word = quizWords[currentQuizIndex];
    
    let modeHtml = "";
    if (selectedQuizMode === 'flashcards') {
        modeHtml = renderFlashcardsUI(word);
    } else if (selectedQuizMode === 'mcq') {
        modeHtml = renderMCQUI(word);
    } else if (selectedQuizMode === 'spelling') {
        modeHtml = renderSpellingUI(word);
    }

    container.innerHTML = `
        <div class="quiz-container-active" style="padding: 15px; animation: slideIn 0.4s;">
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
                        <p style="font-size: 14px; color: rgba(255,255,255,0.7); position: absolute; bottom: 20px;">اضغط للقلب 👆</p>
                    </div>
                    <div class="card-back" style="display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 20px;">
                        <span style="font-size: 40px; font-family: 'Cairo', sans-serif; font-weight: bold;">${word.ar}</span>
                        <span style="font-size: 18px; color: #777;">${word.pl !== '-' ? 'Plural: ' + word.pl : ''}</span>
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
            <div class="question-box" style="background: white; padding: 40px 20px; border-radius: 20px; text-align: center; margin-bottom: 25px; box-shadow: 0 5px 15px rgba(0,0,0,0.05);">
                <span style="font-size: 50px; display: block; margin-bottom: 10px;">${word.emoji}</span>
                <h2 style="font-size: 32px; color: var(--navy-color);">${word.art ? word.art + ' ' : ''}${word.word}</h2>
                <p style="color: #888; margin-top: 10px;">ما معنى هذه الكلمة؟</p>
            </div>
            <div class="quiz-options">
                ${optionsHtml}
            </div>
            ${quizAnswered ? `<div style="text-align: center; margin-top: 25px;"><button class="next-btn" onclick="nextQuizQuestion()">التالي ➡️</button></div>` : ''}
        </div>
    `;
}

function answerMCQ(selected, correct) {
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
}

function renderSpellingUI(word) {
    return `
        <div class="spelling-quiz-view">
            <div class="question-box" style="background: white; padding: 30px 20px; border-radius: 20px; text-align: center; margin-bottom: 25px; box-shadow: 0 5px 15px rgba(0,0,0,0.05);">
                <span style="font-size: 60px; display: block; margin-bottom: 10px;">${word.emoji}</span>
                <h2 style="font-family: 'Cairo', sans-serif; color: var(--navy-color);">${word.ar}</h2>
                <p style="color: #888; margin-top: 10px;">اكتب الكلمة بالألمانية</p>
            </div>
            
            <div class="input-container" style="max-width: 400px; margin: 0 auto;">
                <input type="text" id="spelling-input" value="${spellingInput}" placeholder="اكتب هنا..." 
                    style="width: 100%; padding: 15px 20px; border: 2px solid #eee; border-radius: 15px; font-size: 20px; text-align: center; outline: none; transition: border-color 0.3s;"
                    ${quizAnswered ? 'disabled' : ''} oninput="spellingInput = this.value">
                
                ${quizAnswered ? `
                    <div class="feedback-spelling" style="margin-top: 20px; text-align: center; padding: 15px; border-radius: 15px; background: ${spellingInput.toLowerCase().trim() === word.word.toLowerCase().trim() ? '#eafaf1' : '#fdedec'};">
                        <p style="font-weight: bold; color: ${spellingInput.toLowerCase().trim() === word.word.toLowerCase().trim() ? '#27ae60' : '#c0392b'};">
                            ${spellingInput.toLowerCase().trim() === word.word.toLowerCase().trim() ? '✅ إجابة صحيحة!' : '❌ إجابة خاطئة!'}
                        </p>
                        <p style="margin-top: 5px;">الإجابة الصحيحة: <span style="font-weight: bold; font-size: 20px;">${word.art ? word.art + ' ' : ''}${word.word}</span></p>
                        <button class="btn-audio" onclick="playWordAudio(${word.id})" style="margin-top: 10px;">🔊 استمع</button>
                    </div>
                ` : `
                    <button class="start-quiz-btn" onclick="checkSpelling('${word.word.replace(/'/g, "\\'")}')" style="width: 100%; margin-top: 20px;">تحقق ✅</button>
                `}
            </div>
            
            ${quizAnswered ? `<div style="text-align: center; margin-top: 25px;"><button class="next-btn" onclick="nextQuizQuestion()">التالي ➡️</button></div>` : ''}
        </div>
    `;
}

function checkSpelling(correct) {
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
}

function nextQuizQuestion() {
    currentQuizIndex++;
    quizAnswered = false;
    selectedAnswer = null;
    spellingInput = "";
    renderView();
}

function renderQuizResult(container) {
    const percentage = Math.round((quizScore / quizWords.length) * 100);
    let emoji = percentage >= 80 ? '🏆' : percentage >= 60 ? '⭐' : '💪';
    let message = percentage >= 80 ? 'أحسنت صنعاً يا بطل!' : percentage >= 60 ? 'عمل جيد، استمر في التدرب!' : 'لا بأس، حاول مرة أخرى!';

    // Award 8 points if score > 70% (tracked per quiz category/mode session)
    const quizKey = `quiz_reward_${selectedQuizCategory}_${selectedQuizMode}`;
    if (percentage > 70 && !sessionStorage.getItem(quizKey)) {
        sessionStorage.setItem(quizKey, 'true');
        awardPoints(8, 'اجتياز اختبار (>70%)');
    }

    container.innerHTML = `
        <div class="quiz-result" style="text-align: center; padding: 40px 20px; animation: scaleIn 0.5s;">
            <div style="font-size: 80px; margin-bottom: 20px;">${emoji}</div>
            <h2 style="font-family: 'Cairo', sans-serif;">اكتمل الاختبار!</h2>
            <p style="font-size: 20px; margin: 10px 0;">${message}</p>
            <div class="result-score" style="font-size: 60px; font-weight: 900; color: var(--burgundy-color); margin: 20px 0;">${quizScore} / ${quizWords.length}</div>
            <p class="result-percent" style="font-size: 24px; color: #777; margin-bottom: 30px;">نسبة النجاح: ${percentage}%</p>
            
            <div style="display: flex; flex-direction: column; gap: 15px; max-width: 300px; margin: 0 auto;">
                <button class="start-quiz-btn" onclick="startQuizMode('${selectedQuizMode}')">إعادة الاختبار 🔄</button>
                <button class="back-btn" onclick="selectedQuizMode=null; renderView();" style="background: #f0f0f0; border: none; padding: 12px; border-radius: 25px; cursor: pointer; font-weight: bold;">تغيير النمط ⚙️</button>
                <button class="back-btn" onclick="selectedQuizCategory=null; selectedQuizMode=null; renderView();" style="background: none; border: none; color: #888; cursor: pointer;">العودة للتصنيفات</button>
            </div>
        </div>
    `;
}
