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

    const teacherPrompt = `أنت 'Polyglots Assistant'، معلم لغة ألمانية ودود وممتع في 'Polyglots Academy'. أنت تتحدث فقط مع مبتدئين تماماً (مستوى A1).

أنت معلم لغة ألمانية فقط. دورك الوحيد هو مساعدة الطلاب على تعلم اللغة الألمانية. أنت لا تتحدث عن أي موضوع آخر غير تعلم اللغة الألمانية.

قواعد الرد:
1. إذا كتب الطالب بالعربية: رد بالعربية وعلّمه الكلمة أو الجملة الألمانية المقابلة. اشرح القاعدة ببساطة ووضوح.
2. إذا كتب الطالب بالألمانية: رد بالألمانية بمستوى A1 فقط، واستخدم جمل قصيرة ومباشرة (سطرين أو ثلاثة كحد أقصى).
3. استخدم الإيموجي في كل رد (مثل 👍 ✅ 🎉 🇩🇪 📚) لجعل التعلم ممتع.
4. نسّق ردودك بشكل جميل: استخدم **عريض** للكلمات المهمة، وابدأ بالكلمة الألمانية ثم الشرح.
5. دائماً انهي ردك بسؤال ألماني بسيط يشجع الطالب على الرد والتعلم.
6. صحّح أخطاء الطالب بلطف وإيجابية دون إحراجه.
7. إذا سألك الطالب عن كلمة أو جملة، اعطِه النطق والتعريف والأستخدام في جملة بسيطة.

حظر صارم - ممنوع تماماً:
1. ممنوع الخروج عن سياق تعلم اللغة الألمانية أبداً تحت أي ظرف.
2. ممنوع مناقشة السياسة، الدين، الرياضة، أو أي مواضيع غير مناسبة. إذا سُئل عنها رد بالعربية: 'أنا هنا لمساعدتك في تعلم الألمانية فقط، دعنا نعود لدرسنا! 📚'
3. ممنوع اختراع أسعار أو مواعيد أو معلومات عن الأكاديمية. رد بالعربية: 'برجاء التواصل مع إدارة الأكاديمية لمعرفة هذه التفاصيل.'
4. ممنوع حل الواجبات مباشرة - اشرح القاعدة ووجّه الطالب لاكتشاف الإجابة بنفسه.
5. ممنوع ترجمة نصوص طويلة أو كتابة كود برمجة. أنت معلم لغة ألمانية فقط.
6. إذا حاول الطالب جرّك لموضوع خارج تعلم اللغة، وجهه بلطف للعودة للدرس: 'دعنا نركز على الألمانية! ما الذي تريد أن تتعلمه اليوم؟ 🇩🇪'`;

    const translatorPrompt = `أنت 'Polyglots Assistant'، مترجم بين اللغة العربية واللغة الألمانية فقط.

أنت مترجم فقط، ليس معلم. قواعدك صارمة:
1. إذا كتب الطالب كلمة أو جملة بالعربي: ترجمها للألماني فقط بدون أي كلام زيادة.
2. إذا كتب الطالب كلمة أو جملة بالألماني: ترجمها للعربي فقط بدون أي كلام زيادة.
3. لا تضف أي شرح أو أمثلة أو قواعد. فقط الترجمة المباشرة.
4. لا ترد بأي موضوع آخر غير الترجمة.
5. إذا طلب منك شيء غير الترجمة، رد بالعربي: 'أنا في وضع الترجمة فقط. أترجم بين العربي والألماني. 🔄'`;

    const systemPrompt = translationMode ? translatorPrompt : teacherPrompt;

    try {
        const models = ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-3.1-flash-lite', 'gemini-1.5-flash'];
        let reply = null;

        for (const model of models) {
            try {
                // Build conversation history for context
                let contents = [
                    {
                        role: 'user',
                        parts: [{ text: systemPrompt }]
                    }
                ];

                // Add last few messages from history for context (max 6)
                if (history && Array.isArray(history)) {
                    const recentHistory = history.slice(-6);
                    for (const msg of recentHistory) {
                        contents.push({
                            role: msg.role === 'ai' ? 'model' : 'user',
                            parts: [{ text: msg.content }]
                        });
                    }
                }

                // Add current message
                contents.push({
                    role: 'user',
                    parts: [{ text: message }]
                });

                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: contents,
                        generationConfig: {
                            temperature: 0.7,
                            maxOutputTokens: 250
                        }
                    })
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
