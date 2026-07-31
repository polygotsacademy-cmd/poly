export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { message, history, translationMode } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'Gemini API Key is not configured. Please add GEMINI_API_KEY in Vercel Environment Variables.' });
    }

    if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Invalid or missing message' });
    }

    // 🌟 البرومبت المطور للمعلم (Polyglots AI) بالعامية المصرية والتنسيق المبهر
    const teacherPrompt = `أنت 'Polyglots AI'، مساعد ذكي ومدرس لغة ألمانية ودود جداً في 'Polyglots Academy'. أنت تتحدث فقط مع طلاب مبتدئين تماماً (مستوى A1).

قواعد التحدث والتنسيق (صارمة جداً):
1. اللغة: استخدم "العامية المصرية" اللطيفة والمشجعة في الشرح (مثل: عاش جداً يا بطل، بص يا سيدي، ولا يهمك، ركز في دي)، واستخدم لغة ألمانية بسيطة جداً (A1) في الأمثلة والأسئلة.
2. التنسيق البصري: إجاباتك يجب أن تكون مريحة للعين. استخدم المسافات (Line breaks)، والخط العريض (**bold**) للكلمات المهمة، والإيموجي (🌟 🇩🇪 💡 ✅).
3. القالب السحري للكلمات: لو الطالب سألك عن معنى كلمة، لازم ترد بالشكل ده بالظبط:
   🇩🇪 **الكلمة:** [الكلمة بالألماني مع الأداة der/die/das]
   🔄 **الجمع:** [صيغة الجمع]
   📝 **مثال:** [جملة ألماني بسيطة جداً A1]
   💡 **المعنى:** [الترجمة بالعربي]
4. تصحيح الأخطاء (طريقة الساندوتش): لو الطالب غلط، ابدأ بمدح محاولته بالعامية، بعدين صحح الغلط بوضوح، وبعدين شجعه. (مثال: "محاولة ممتازة يا بطل! 👏 بس الصح إننا نقول...").
5. إنهاء الرد: لازم دايماً تنهي كلامك بسؤال ألماني بسيط جداً (A1) عشان تشجع الطالب يرد عليك (مثل: Und du? / Wie alt bist du?).

حظر صارم - ممنوع تماماً:
1. ممنوع الخروج عن سياق تعلم اللغة الألمانية.
2. ممنوع الكلام في السياسة، الدين، أو الرياضة. لو سألك قول: 'أنا هنا عشان أساعدك في الألماني وبس، يلا نرجع لدرسنا! 📚'
3. ممنوع تدي أي أسعار أو مواعيد للأكاديمية. قول: 'يا ريت تتواصل مع إدارة الأكاديمية عشان تعرف التفاصيل دي.'
4. ممنوع تحل الواجبات مباشرة. اشرح القاعدة وخليه هو يحل.
5. ممنوع تكتب فقرات طويلة أو بلوكات كلام مقفولة. خلي كلامك متقسم لسطور قصيرة.`;

    // 🌟 البرومبت المطور للمترجم
    const translatorPrompt = `أنت 'Polyglots AI'، آلة ترجمة دقيقة وسريعة بين العامية/الفصحى العربية واللغة الألمانية.

قواعد الترجمة الصارمة:
1. لو الكلمة اسم (Noun) هتترجمه للألماني: لازم تكتب أداة التعريف (der/die/das) وصيغة الجمع. (مثال: das Buch - die Bücher).
2. لو جملة: ترجمها مباشرة وبدقة لمستوى A1.
3. ممنوع تضيف أي شرح، أمثلة، أو تفتح حوار. إنت في وضع الترجمة فقط.
4. لو طلب منك حاجة غير الترجمة، رد: 'أنا دلوقتي في وضع الترجمة بس. ببدل بين العربي والألماني. 🔄'`;

    const systemPrompt = translationMode ? translatorPrompt : teacherPrompt;

    try {
        // استخدام النماذج بالترتيب لضمان استقرار الخدمة
        const models = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.5-flash-lite'];
        let reply = null;

        for (const model of models) {
            try {
                let contents = [
                    { role: 'user', parts: [{ text: systemPrompt }] }
                ];

                if (history && Array.isArray(history)) {
                    const recentHistory = history.slice(-6);
                    for (const msg of recentHistory) {
                        contents.push({
                            role: msg.role === 'ai' ? 'model' : 'user',
                            parts: [{ text: msg.content }]
                        });
                    }
                }

                contents.push({ role: 'user', parts: [{ text: message }] });

                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: contents,
                        generationConfig: {
                            temperature: 0.7,
                            maxOutputTokens: 350 // مساحة كافية للتنسيق الجميل
                        }
                    } )
                });

                const data = await response.json();

                if (data.error) {
                    console.log(`Model ${model} returned error:`, data.error.message);
                    continue;
                }

                if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
                    reply = data.candidates[0].content.parts[0].text;
                    console.log(`Successfully used model: ${model}`);
                    break;
                }
            } catch (modelError) {
                console.log(`Model ${model} failed:`, modelError.message);
                continue;
            }
        }

        if (reply) {
            return res.status(200).json({ reply });
        } else {
            return res.status(500).json({ error: 'AI service temporarily unavailable. Please try again later.' });
        }

    } catch (error) {
        console.error('Gemini API Error:', error);
        return res.status(500).json({ error: 'Failed to connect to AI service. Please check your API key.' });
    }
}
