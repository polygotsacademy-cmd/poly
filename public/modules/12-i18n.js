/* Polyglots interface language switcher. German learning content is intentionally not translated. */

const UI_PAIRS = [
    ['Welcome Back', 'مرحبًا بعودتك'], ['Username', 'اسم المستخدم'], ['Password', 'كلمة المرور'], ['Remember Me', 'تذكرني'], ['Login', 'دخول'], ['Logout', 'خروج'],
    ['Words', 'الكلمات'], ['Stories', 'القصص'], ['Quizzes', 'الاختبارات'], ['Pronunciation', 'النطق'], ['Games', 'الألعاب'], ['Poly chat', 'المحادثة المباشرة'], ['Leaderboard', 'لوحة الشرف'], ['Announcements', 'الإعلانات'],
    ['Search in German or Arabic...', 'ابحث بالألمانية أو العربية...'], ['Delete message?', 'مسح الرسالة؟'], ['Delete for me only', 'مسح لي فقط'], ['Delete for everyone', 'مسح للجميع'], ['Cancel', 'إلغاء'], ['Forward message', 'إعادة توجيه الرسالة'], ['Select all recipients', 'اختيار كل المستلمين'], ['Send', 'إرسال'], ['Choose your character', 'اختر شخصيتك'], ['Close', 'إغلاق'],
    ['No data available', 'لا توجد بيانات حالياً'], ['An error occurred while loading the leaderboard', 'حدث خطأ أثناء تحميل لوحة الشرف'], ['Loading leaderboard... ⏳', 'جاري تحميل لوحة الشرف... ⏳'], ['Leaderboard and academy champions', 'لوحة الشرف وأبطال الأكاديمية'], ['Compete with your classmates and collect points to reach the top!', 'تنافس مع زملائك واجمع النقاط لتتصدر القائمة!'], ['You', 'أنت'],
    ['Loading messages...', 'جاري تحميل الرسائل...'], ['No messages yet. Say hi!', 'لا توجد رسائل بعد. قل مرحبًا!'], ['Error loading messages.', 'حدث خطأ أثناء تحميل الرسائل.'], ['Type a message...', 'اكتب رسالة...'], ['Fullscreen', 'ملء الشاشة'], ['Messages', 'الرسائل'], ['Images', 'الصور'], ['Voice', 'الصوت'], ['Recording', 'جاري التسجيل'], ['Send a message', 'أرسل رسالة'], ['Start the conversation now...', 'ابدأ المحادثة الآن...'],
    ['Your smart assistant for learning German', 'مساعدك الذكي لتعلم الألمانية'], ['Translator', 'مترجم'], ['Teacher', 'مدرس'], ['Type here...', 'اكتب هنا...'], ['Listen', 'استمع'], ['Listen to pronunciation', 'استمع للنطق'], ['Back', 'رجوع'], ['Change mode', 'تغيير النمط'], ['Save', 'حفظ'], ['Delete', 'حذف'], ['Edit', 'تعديل'], ['Add', 'إضافة'], ['Search', 'بحث'], ['Next', 'التالي'], ['Previous', 'السابق'], ['Done', 'تم'], ['Error', 'خطأ'], ['Loading...', 'جاري التحميل...'], ['No results', 'لا توجد نتائج'], ['Choose a category', 'اختر تصنيفًا'],
    ['Categories', 'التصنيفات'], ['Direct messages', 'الرسائل المباشرة'], ['Unread message', 'رسالة غير مقروءة'], ['Read', 'مقروءة'], ['One gray check', 'صح واحدة رمادي'], ['Two blue checks', 'صحين باللون الأزرق'],
    ['Educational games', 'الألعاب التعليمية'], ['The correct answer:', 'الإجابة الصحيحة:'], ['Complete story listening', 'الاستماع للقصة بالكامل'], ['Listen to a word', 'استماع لكلمة'], ['Listen to the story:', 'استمع للقصة:'], ['Write the word in German', 'اكتب الكلمة بالألمانية'], ['Write the word in German correctly', 'اكتب الكلمة بالألمانية بشكل صحيح'], ['What does this word mean?', 'ما معنى هذه الكلمة؟'], ['Next word', 'الكلمة التالية'], ['Back to categories', 'العودة للتصنيفات'], ['Press to heart', 'اضغط للقلب'],
    ['Announcements sent to you by the academy administration.', 'الإعلانات المرسلة إليك من إدارة الأكاديمية.'], ['No announcements yet.', 'لا توجد إعلانات حتى الآن.'], ['Write the announcement text first.', 'اكتب نص الإعلان أولًا.'], ['Write announcement here...', 'اكتب رسالة الإعلان هنا...'], ['Send announcement', 'إرسال الإعلان'], ['Announcement sent successfully.', 'تم إرسال الإعلان بنجاح.'], ['You do not have permission to send an announcement.', 'ليس لديك صلاحية إرسال إعلان.'], ['Could not send the announcement. Check your connection.', 'تعذر إرسال الإعلان. تأكد من اتصالك'], ['Could not load announcements. Check your settings.', 'تعذر تحميل الإعلانات. تأكد من إعدادات'],
    ['Good job, keep practicing!', 'عمل جيد، استمر في التدرب!'], ['Not bad, try again!', 'لا بأس، حاول مرة أخرى!'], ['The quiz is complete!', 'اكتمل الاختبار!'], ['Success rate:', 'نسبة النجاح:'], ['points!', 'نقاط!'], ['Daily login reward:', 'مكافأة الدخول اليومي:'], ['Academy champion', 'بطل الأكاديمية'],
    ['Could not connect to the server. Try again.', 'تعذر الاتصال بالخادم. حاول مرة أخرى.'], ['Sorry, something went wrong. Try again.', 'عذراً، حدث خطأ ما. حاول مرة أخرى.'], ['Sorry, I cannot connect to the server right now.', 'عذراً، لا يمكنني الاتصال بالخادم حالياً.'], ['No matching results', 'لا توجد نتائج مطابقة'], ['No recipients available.', 'لا يوجد مستلمون متاحون.'],
    ['Please allow microphone access to record audio.', 'يرجى السماح بالوصول للميكروفون لتسجيل الصوت.'], ['We need microphone permission so you can record audio!', 'لازم تدينا إذن المايك عشان تقدر تسجل صوتك!'], ['Recording ready', 'تسجيل صوتي جاهز'], ['Recording... (maximum 30 seconds)', 'جاري التسجيل... (أقصى مدة 30 ثانية)'], ['Recording... (maximum 100 seconds)', 'جاري التسجيل... (أقصى مدة 100 ثانية)'], ['Recording stopped at the maximum: 100 seconds.', 'تم إيقاف التسجيل عند الحد الأقصى: 100 ثانية.'],
    ['You have reached the daily limit for this type of message.', 'لقد وصلت إلى الحد اليومي لهذا النوع من الرسائل.'], ['You have reached the daily limit for voice messages (4).', 'لقد وصلت للحد الأقصى للرسائل الصوتية اليوم (4 رسائل).'], ['You have reached the daily limit for images (4).', 'لقد وصلت للحد الأقصى للصور اليوم (4 صور).'], ['The usage limit could not be checked right now.', 'لا يمكن التحقق من حد الاستخدام حاليًا.'], ['The chat limit could not be checked right now.', 'لا يمكن التحقق من حد المحادثة حاليًا.'], ['Could not update the usage limit. Try again.', 'تعذر تحديث حد الاستخدام. حاول مرة أخرى.'], ['Could not update the chat limit. Try again.', 'تعذر تحديث حد المحادثة. حاول مرة أخرى.'], ['Could not forward the message. Try again.', 'تعذر إعادة توجيه الرسالة. حاول مرة أخرى.'], ['The message was deleted', 'تم مسح هذه الرسالة'], ['Read status added', 'تمت إضافة حالة القراءة'], ['Message forwarded to', 'تمت إعادة توجيه الرسالة إلى'], ['Available users', 'مستخدمًا متاحًا'], ['recipient.', 'مستلم.'], ['Database', 'في قاعدة البيانات'],
    ['Don’t forget Gaza and Sudan', 'لا تنسَ غزة والسودان'], ['The boycott continues', 'المقاطعة مستمرة'], ['Don\'t forget Gaza and Sudan — the boycott continues', 'لا_تنسى_غزة_و_السودان_المقاطعة_مستمرة'], ['Polyglots Academy - 15 May city', 'Polyglots Academy - 15 May city']
];

const EN_TO_AR = Object.fromEntries(UI_PAIRS);
const AR_TO_EN = Object.fromEntries(UI_PAIRS.map(([en, ar]) => [ar, en]));
Object.assign(AR_TO_EN, {
    'تسجيل الخروج': 'Log out', 'الكلمات': 'Words', 'القصص': 'Stories', 'الاختبارات': 'Quizzes', 'النطق': 'Pronunciation', 'الألعاب': 'Games', 'المحادثة المباشرة': 'Poly chat', 'لوحة الشرف': 'Leaderboard', 'الإعلانات': 'Announcements', 'الرسائل': 'Messages', 'الصور': 'Images', 'الصوت': 'Voice', 'العربية': 'Arabic',
    'كروت تظهر بالألمانية وتتقلب لتظهر المعنى بالعربي': 'Cards appear in German and flip to show the Arabic meaning', 'في قاعدة البيانات': 'In the database', 'اختيار من متعدد': 'Multiple choice', 'نمط الكتابة': 'Writing mode', 'نمط الكروت': 'Cards mode', 'جاري الإرسال...': 'Sending...', 'تحديث حالة الرسائل إلى': 'Updating message status to', 'تجميع الرسائل غير المقروءة لتحديثها': 'Collecting unread messages to update them', 'مقروءة': 'Read', 'صح واحدة رمادي': 'One gray check', 'صحين باللون الأزرق': 'Two blue checks', 'فراو': 'Frau', 'يوسف': 'Youssef',
    'أرسل رسالة': 'Send a message', 'أنشئ إعلانًا وحدد الطلاب الذين سيصلهم.': 'Create an announcement and choose the students who will receive it.', 'إرسال إعلان جديد': 'Send a new announcement', 'إضافة علامات الصح': 'Add check marks', 'إجابة خاطئة!': 'Wrong answer!', 'إجابة صحيحة!': 'Correct answer!', 'اجتياز اختبار': 'Passing quiz', 'اختبر معلوماتك': 'Test your knowledge', 'اختر التصنيف الذي تريد التدرب عليه': 'Choose the category you want to practice', 'اختر المستقبلين': 'Choose recipients', 'اختر المعنى الصحيح من بين 4 اختيارات': 'Choose the correct meaning from 4 choices', 'اختر مستلماً واحداً على الأقل لإعادة توجيه الرسالة.': 'Choose at least one recipient to forward the message.', 'استماع لكلمة': 'Listen to a word', 'استمع للقصة:': 'Listen to the story:', 'اكتب رسالة الإعلان هنا...': 'Write the announcement here...', 'اكتب رسالة...': 'Write a message...', 'اكتب نص الإعلان أولًا.': 'Write the announcement text first.', 'اكتب هنا...': 'Type here...', 'الألعاب التعليمية': 'Educational games', 'الإجابة الصحيحة:': 'The correct answer:', 'الاستماع للقصة بالكامل': 'Complete story listening', 'التالي': 'Next', 'التبديل إلى العربية': 'Switch to Arabic', 'الرسائل المباشرة': 'Direct messages', 'الرسائل:': 'Messages:', 'السابق': 'Previous', 'الصوت:': 'Voice:', 'الصور:': 'Images:', 'العودة للتصنيفات': 'Back to categories', 'الكلمة التالية': 'Next word', 'اضغط للقلب': 'Press to heart', 'تحقق': 'Check', 'تعديل': 'Edit', 'تغيير النمط': 'Change mode', 'حذف الرسالة': 'Delete message', 'رجوع': 'Back', 'رسالة غير مقروءة': 'Unread message', 'مكافأة الدخول اليومي:': 'Daily login reward:', 'نتائج البحث عن': 'Search results for', 'نسبة النجاح:': 'Success rate:', 'مساعدك الذكي لتعلم الألمانية': 'Your smart assistant for learning German', 'ليس لديك صلاحية إرسال إعلان.': 'You do not have permission to send an announcement.', 'لا توجد إعلانات حتى الآن.': 'No announcements yet.', 'لا توجد نتائج مطابقة': 'No matching results', 'لا يوجد مستلمون متاحون.': 'No recipients available.', 'لم يتم تحميل قائمة المستخدمين من تسجيل الدخول بعد.': 'The user list has not loaded from login yet.', 'لازم تدينا إذن المايك عشان تقدر تسجل صوتك!': 'We need microphone permission so you can record audio!', 'يرجى السماح بالوصول للميكروفون لتسجيل الصوت.': 'Please allow microphone access to record audio.', 'تسجيل صوتي جاهز': 'Recording ready', 'جاري التسجيل': 'Recording', 'جاري التسجيل... (أقصى مدة 30 ثانية)': 'Recording... (maximum 30 seconds)', 'جاري الإرسال...': 'Sending...', 'عذراً، حدث خطأ ما. حاول مرة أخرى.': 'Sorry, something went wrong. Try again.', 'عذراً، لا يمكنني الاتصال بالخادم حالياً.': 'Sorry, I cannot connect to the server right now.', 'عمل جيد، استمر في التدرب!': 'Good job, keep practicing!', 'لا بأس، حاول مرة أخرى!': 'Not bad, try again!', 'تم الوصول إلى حد الاستخدام اليومي.': 'The daily usage limit has been reached.', 'تم مسح هذه الرسالة': 'This message was deleted', 'تمت إضافة حالة القراءة': 'Read status added', 'تعذر إرسال الإعلان. تأكد من اتصال': 'Could not send the announcement. Check your connection.', 'تعذر تحميل الإعلانات. تأكد من إعدادات': 'Could not load announcements. Check your settings.'
});

function currentLanguage() { return localStorage.getItem('polyglots_language') === 'en' ? 'en' : 'ar'; }
function translateValue(value, language = currentLanguage()) {
    const text = String(value ?? '').trim();
    if (!text) return value;
    const dictionary = language === 'en' ? AR_TO_EN : EN_TO_AR;
    if (dictionary[text]) return dictionary[text];
    if (language === 'en') {
        if (text.startsWith('نتائج البحث عن')) return text.replace('نتائج البحث عن', 'Search results for');
        if (text.startsWith('نسبة النجاح:')) return text.replace('نسبة النجاح:', 'Success rate:');
        if (text.startsWith('نقاط!')) return text.replace('نقاط!', 'points!');
        if (text.startsWith('تمت إعادة توجيه الرسالة إلى')) return text.replace('تمت إعادة توجيه الرسالة إلى', 'Message forwarded to');
        if (text.startsWith('جاري التسجيل (')) return text.replace('جاري التسجيل (', 'Recording (');
        if (text.endsWith('ثانية)...')) return text.replace('ثانية)...', 'seconds)...');
        if (text.endsWith('أيام)')) return text.replace('أيام)', 'days)');
        if (text.includes('الـ 3 تسجيلات بتوع النهاردة')) return 'You have used all 3 voice recordings for today. Come back tomorrow.';
        if (text.includes('الـ 3 صور بتوع النهاردة')) return 'You have used all 3 images for today. Come back tomorrow.';
    }
    return text;
}

function translateTextNodes(root, language) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let node;
    while ((node = walker.nextNode())) nodes.push(node);
    nodes.forEach(textNode => {
        const parent = textNode.parentElement;
        if (!parent || ['SCRIPT', 'STYLE', 'TEXTAREA'].includes(parent.tagName)) return;
        if (parent.closest('[data-content-language="de"], .german-content, .german-text')) return;
        const current = textNode.nodeValue;
        const trimmed = current.trim();
        if (!trimmed) return;
        if (!textNode.__i18nSource) textNode.__i18nSource = trimmed;
        const translated = translateValue(textNode.__i18nSource, language);
        if (translated !== trimmed) textNode.nodeValue = current.replace(trimmed, translated);
    });
}

function applyLanguage() {
    const language = currentLanguage();
    const isEnglish = language === 'en';
    document.documentElement.lang = language;
    document.documentElement.dir = isEnglish ? 'ltr' : 'rtl';
    document.body.dir = isEnglish ? 'ltr' : 'rtl';
    document.querySelectorAll('[data-i18n-key]').forEach(element => { element.textContent = translateValue(element.dataset.i18nKey, language); });
    translateTextNodes(document.body, language);
    document.querySelectorAll('input[placeholder], textarea[placeholder]').forEach(element => {
        if (!element.dataset.i18nPlaceholder) element.dataset.i18nPlaceholder = element.placeholder;
        element.placeholder = translateValue(element.dataset.i18nPlaceholder, language);
    });
    document.querySelectorAll('[title], [aria-label]').forEach(element => {
        if (element.title) { if (!element.dataset.i18nTitle) element.dataset.i18nTitle = element.title; element.title = translateValue(element.dataset.i18nTitle, language); }
        if (element.getAttribute('aria-label')) { if (!element.dataset.i18nAriaLabel) element.dataset.i18nAriaLabel = element.getAttribute('aria-label'); element.setAttribute('aria-label', translateValue(element.dataset.i18nAriaLabel, language)); }
    });
    document.querySelectorAll('.language-toggle').forEach(toggle => {
        toggle.textContent = isEnglish ? 'العربية' : 'English';
        toggle.setAttribute('aria-label', isEnglish ? 'التبديل إلى العربية' : 'Switch to English');
        toggle.title = isEnglish ? 'التبديل إلى العربية' : 'Switch to English';
    });
}

function toggleLanguage() {
    localStorage.setItem('polyglots_language', currentLanguage() === 'en' ? 'ar' : 'en');
    applyLanguage();
    if (typeof renderView === 'function' && typeof currentUser !== 'undefined' && currentUser) renderView();
    applyLanguage();
}

window.applyLanguage = applyLanguage;
window.toggleLanguage = toggleLanguage;
window.currentLanguage = currentLanguage;
window.t = value => translateValue(value, currentLanguage());
