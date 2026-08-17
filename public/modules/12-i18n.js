/* Polyglots interface language switcher. Content data remains untouched. */

const UI_TRANSLATIONS = {
    'Welcome Back': 'مرحبًا بعودتك',
    'Username': 'اسم المستخدم',
    'Password': 'كلمة المرور',
    'Remember Me': 'تذكرني',
    'Login': 'دخول',
    'Logout': 'خروج',
    'English': 'English',
    'العربية': 'العربية',
    'Words': 'الكلمات',
    'Stories': 'القصص',
    'Quizzes': 'الاختبارات',
    'Pronunciation': 'النطق',
    'Games': 'الألعاب',
    'Poly chat': 'المحادثة المباشرة',
    'leaderboard': 'لوحة الشرف',
    'announcement': 'الإعلانات',
    'Search in German or Arabic...': 'ابحث بالألمانية أو العربية...',
    'Search in German or Arabic...': 'ابحث بالألمانية أو العربية...',
    'Welcome Back': 'مرحبًا بعودتك',
    'مسح الرسالة؟': 'Delete message?',
    'مسح لي فقط': 'Delete for me only',
    'مسح للجميع': 'Delete for everyone',
    'إلغاء': 'Cancel',
    'إعادة توجيه الرسالة': 'Forward message',
    'اختيار كل المستلمين': 'Select all recipients',
    'إرسال': 'Send',
    'اختر شخصيتك': 'Choose your character',
    'إغلاق': 'Close',
    'Polyglots Academy - 15 May city': 'Polyglots Academy - 15 May city',
    'لا توجد بيانات حالياً': 'No data available',
    'حدث خطأ أثناء تحميل لوحة الشرف': 'An error occurred while loading the leaderboard',
    'جاري تحميل لوحة الشرف... ⏳': 'Loading leaderboard... ⏳',
    'لوحة الشرف وأبطال الأكاديمية': 'Leaderboard and academy champions',
    'تنافس مع زملائك واجمع النقاط لتتصدر القائمة!': 'Compete with your classmates and collect points to reach the top!',
    'أنت': 'You',
    'لا تنسَ غزة والسودان — المقاطعة مستمرة': "Don't forget Gaza and Sudan — the boycott continues",
    'لا_تنسى_غزة_و_السودان_المقاطعة_مستمرة': "Don't forget Gaza and Sudan — the boycott continues",
    'Loading messages...': 'جاري تحميل الرسائل...',
    'No messages yet. Say hi!': 'لا توجد رسائل بعد. قل مرحبًا!',
    'Error loading messages.': 'حدث خطأ أثناء تحميل الرسائل.',
    'Type a message...': 'اكتب رسالة...',
    'Fullscreen': 'ملء الشاشة',
    'الرسائل': 'Messages',
    'الصور': 'Images',
    'الصوت': 'Voice',
    'جاري التسجيل': 'Recording',
    'أرسل رسالة': 'Send a message',
    'ابدأ المحادثة الآن...': 'Start the conversation now...',
    'مساعدك الذكي لتعلم الألمانية': 'Your smart assistant for learning German',
    'ابدأ المحادثة الآن...': 'Start the conversation now...',
    'مترجم': 'Translator',
    'مدرس': 'Teacher',
    'اكتب هنا...': 'Type here...',
    'استمع': 'Listen',
    'استمع للنطق': 'Listen to pronunciation',
    'رجوع': 'Back',
    'تغيير النمط': 'Change mode',
    'No messages yet. Say hi!': 'لا توجد رسائل بعد. قل مرحبًا!',
    'Loading messages...': 'جاري تحميل الرسائل...',
    'Error loading messages.': 'حدث خطأ أثناء تحميل الرسائل.'
};

Object.assign(UI_TRANSLATIONS, {
    'تسجيل الخروج': 'Log out',
    'الكلمات': 'Words',
    'القصص': 'Stories',
    'الاختبارات': 'Quizzes',
    'النطق': 'Pronunciation',
    'الألعاب': 'Games',
    'المحادثة المباشرة': 'Poly chat',
    'لوحة الشرف': 'Leaderboard',
    'الإعلانات': 'Announcements',
    'حفظ': 'Save',
    'حذف': 'Delete',
    'تعديل': 'Edit',
    'إضافة': 'Add',
    'بحث': 'Search',
    'التالي': 'Next',
    'السابق': 'Previous',
    'تم': 'Done',
    'خطأ': 'Error',
    'جاري التحميل...': 'Loading...',
    'لا توجد نتائج': 'No results',
    'اختر تصنيفًا': 'Choose a category',
    'استمع للنطق': 'Listen to pronunciation'
});

const UI_ARABIC_TO_ENGLISH = Object.fromEntries(Object.entries(UI_TRANSLATIONS).map(([key, value]) => [value, key]));

function currentLanguage() {
    return localStorage.getItem('polyglots_language') === 'en' ? 'en' : 'ar';
}

function translateValue(value, language) {
    if (!value) return value;
    const dictionary = language === 'en' ? UI_ARABIC_TO_ENGLISH : UI_TRANSLATIONS;
    return dictionary[value.trim()] || value;
}

function translateTextNodes(root, language) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let node;
    while ((node = walker.nextNode())) nodes.push(node);

    nodes.forEach(textNode => {
        const parent = textNode.parentElement;
        if (!parent || ['SCRIPT', 'STYLE', 'TEXTAREA'].includes(parent.tagName)) return;
        const trimmed = textNode.nodeValue.trim();
        if (!trimmed) return;
        if (!textNode.__i18nSource) textNode.__i18nSource = trimmed;
        const translated = translateValue(textNode.__i18nSource, language);
        if (translated !== trimmed) {
            textNode.nodeValue = textNode.nodeValue.replace(trimmed, translated);
        }
    });
}

function applyLanguage() {
    const language = currentLanguage();
    const isEnglish = language === 'en';
    document.documentElement.lang = language;
    document.documentElement.dir = isEnglish ? 'ltr' : 'rtl';
    document.body.dir = isEnglish ? 'ltr' : 'rtl';

    document.querySelectorAll('[data-i18n-key]').forEach(element => {
        const key = element.dataset.i18nKey;
        element.textContent = isEnglish ? key : (UI_TRANSLATIONS[key] || key);
    });

    translateTextNodes(document.body, language);

    document.querySelectorAll('input[placeholder], textarea[placeholder]').forEach(element => {
        if (!element.dataset.i18nPlaceholder) element.dataset.i18nPlaceholder = element.placeholder;
        element.placeholder = translateValue(element.dataset.i18nPlaceholder, language);
    });
    document.querySelectorAll('[title], [aria-label]').forEach(element => {
        if (element.title) {
            if (!element.dataset.i18nTitle) element.dataset.i18nTitle = element.title;
            element.title = translateValue(element.dataset.i18nTitle, language);
        }
        if (element.getAttribute('aria-label')) {
            if (!element.dataset.i18nAriaLabel) element.dataset.i18nAriaLabel = element.getAttribute('aria-label');
            element.setAttribute('aria-label', translateValue(element.dataset.i18nAriaLabel, language));
        }
    });

    const toggle = document.getElementById('language-toggle');
    if (toggle) {
        toggle.textContent = isEnglish ? 'العربية' : 'English';
        toggle.setAttribute('aria-label', isEnglish ? 'التبديل إلى العربية' : 'Switch to English');
        toggle.title = isEnglish ? 'التبديل إلى العربية' : 'Switch to English';
    }
}

function toggleLanguage() {
    localStorage.setItem('polyglots_language', currentLanguage() === 'en' ? 'ar' : 'en');
    applyLanguage();
    if (typeof renderView === 'function' && currentUser) renderView();
    applyLanguage();
}

window.applyLanguage = applyLanguage;
window.toggleLanguage = toggleLanguage;
window.currentLanguage = currentLanguage;
window.t = function (value) { return translateValue(value, currentLanguage()); };
