export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { mode, text, image, audio, history } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'Gemini API Key is not configured.' });
    }

    // System Prompts for different modes
    const prompts = {
        translator: `أنت 'Polyglots AI' مترجم متخصص. 
        المهمة: ترجمة النصوص بين العامية المصرية واللغة الألمانية (مستوى A1-A2).
        القاعدة: ترجم فقط! لا تشرح، لا ترحب، لا تضف أي كلام جانبي.
        إذا كانت الكلمة اسماً بالألماني، أضف أداة التعريف (der/die/das) والجمع.`,
        
        teacher: `أنت 'Polyglots AI' مدرس ألماني خبير في منهج Deutschprofis A1.1 & A1.2.
        اللغة: تحدث بالعامية المصرية للشرح وبالألمانية البسيطة للأمثلة.
        المهمة: اشرح القواعد بأسلوب شيق وبسيط. استخدم أمثلة من واقع المنهج.
        القيود: لا تخرج عن نطاق مستوى A1-A2. التزم بالدروس التالية:
        
        📘 Deutschprofis A1.1
        1. Lektion 1 – So klingt Deutsch
        2. Lektion 2 – Hallo, das bin ich!
        3. Lektion 3 – Das mache ich gern
        4. Lektion 4 – Meine Familie
        5. Lektion 5 – Daher komme ich
        6. Lektion 6 – Meine Schulsachen

        📗 Deutschprofis A1.2
        7. Lektion 7 – Mein Haus, meine Stadt
        8. Lektion 8 – Meine Woche
        9. Lektion 9 – Meine Freizeit
        10. Lektion 10 – Mein Geburtstag
        11. Lektion 11 – Meine Lieblingstiere
        12. Lektion 12 – Mein Jahr`,
        
        homework: `أنت 'Polyglots AI' مساعد في حل الواجب.
        المهمة: إذا أرسل الطالب صورة واجب أو سأل عن سؤال، قم بتوجيهه وفهمه القاعدة بالعامية المصرية.
        القاعدة الذهبية: ممنوع تماماً إعطاء الإجابة النهائية مباشرة. ساعده ليصل للحل بنفسه من خلال تلميحات وشرح القاعدة.`,
        
        voice: `أنت 'Polyglots AI' خبير صوتيات ونطق.
        المهمة: تحليل النطق والقواعد في التسجيلات الصوتية الألمانية التي يرسلها الطالب.
        الرد: بالعامية المصرية، وضح له نقاط القوة والضعف في نطقه، وصحح له الأخطاء اللغوية.
        التنسيق: استخدم Markdown لتنسيق التصحيحات بشكل جميل وواضح.`
    };

    const systemPrompt = prompts[mode] || prompts.teacher;
    const fullSystemPrompt = `${systemPrompt}\n\nاللغة المستخدمة للرد: العامية المصرية + ألماني (A1-A2) فقط.`;

    try {
        const contents = [];
        
        // Add System Prompt as first user message
        contents.push({
            role: 'user',
            parts: [{ text: `SYSTEM INSTRUCTION: ${fullSystemPrompt}` }]
        });
        contents.push({
            role: 'model',
            parts: [{ text: "فهمت تماماً. سألتزم بوضعي الحالي وباللغة المطلوبة." }]
        });

        // Add History
        if (history && Array.isArray(history)) {
            history.forEach(msg => {
                const parts = [];
                if (msg.content) parts.push({ text: msg.content });
                if (msg.image) {
                    const [mime, data] = msg.image.split(';base64,');
                    parts.push({ inline_data: { mime_type: mime.split(':')[1], data: data } });
                }
                if (msg.audio) {
                    const [mime, data] = msg.audio.split(';base64,');
                    parts.push({ inline_data: { mime_type: mime.split(':')[1], data: data } });
                }
                
                contents.push({
                    role: msg.role === 'ai' ? 'model' : 'user',
                    parts: parts
                });
            });
        }

        // Prepare current message parts
        const currentParts = [];
        if (text) currentParts.push({ text: text });
        
        if (image) {
            const [mime, data] = image.split(';base64,');
            currentParts.push({
                inline_data: {
                    mime_type: mime.split(':')[1],
                    data: data
                }
            });
        }

        if (audio) {
            const [mime, data] = audio.split(';base64,');
            currentParts.push({
                inline_data: {
                    mime_type: mime.split(':')[1],
                    data: data
                }
            });
        }

        contents.push({
            role: 'user',
            parts: currentParts
        });

        // Use a stable model
        const model = 'gemini-1.5-flash';
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: contents,
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 800
                }
            })
        });

        const data = await response.json();

        if (data.error) {
            console.error('Gemini Error:', data.error);
            return res.status(500).json({ error: data.error.message });
        }

        if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
            const reply = data.candidates[0].content.parts[0].text;
            return res.status(200).json({ reply });
        } else {
            return res.status(500).json({ error: 'No response from AI.' });
        }

    } catch (error) {
        console.error('Server Error:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
}
