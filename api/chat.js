export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { message, history, mode } = req.body;
    const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'API Key is not configured.' });
    }

    if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Invalid or missing message' });
    }

    // Strict Character Limit Enforcement on Backend (200 chars)
    if (message.length > 200) {
        return res.status(400).json({ error: 'الرسالة طويلة جداً (الحد الأقصى 200 حرف).' });
    }

    const prompts = {
        teacher: `أنت 'Polyglots AI'، مدرس ألماني ودود جداً للأطفال (عمر 10 سنوات). 
        مهمتك: شرح اللغة الألمانية ببساطة شديدة باستخدام العامية المصرية المحببة للأطفال.
        قواعدك:
        1. ممنوع تماماً الكلام في أي موضوع خارج تعلم اللغة الألمانية. إذا سألك الطالب عن أي شيء آخر، قل بلباقة: "أنا هنا عشان أعلمك ألماني وبس، يلا نرجع لدرسنا الجميل! 🇩🇪"
        2. استخدم الرموز التعبيرية (Emojis) بكثرة لتشجيع الطفل.
        3. اجعل إجاباتك قصيرة، منسقة، ومنظمة في نقاط أو أسطر منفصلة لتكون سهلة القراءة.
        4. استخدم الخط العريض **bold** للكلمات الألمانية المهمة.
        5. في نهاية كل رد، اسأل الطفل سؤالاً بسيطاً بالألمانية لتشجيعه على المحادثة.`,
        
        translator: `أنت مترجم دقيق بين العربية والألمانية لطلاب مبتدئين.
        قواعدك:
        1. ممنوع الكلام في أي شيء خارج الترجمة.
        2. إذا كانت الكلمة اسماً (Noun)، يجب أن تذكر أداة التعريف (der/die/das) وصيغة الجمع (Plural).
           مثال: "كتاب" -> "das Buch (Plural: die Bücher)"
        3. قدم الترجمة فقط بشكل واضح ومختصر بدون مقدمات أو شرح طويل.`
    };

    const systemPrompt = prompts[mode] || prompts.teacher;

    try {
        const model = 'gemini-1.5-flash';
        
        let contents = [
            { role: 'user', parts: [{ text: `System Instruction: ${systemPrompt}` }] },
            { role: 'model', parts: [{ text: "فهمت تماماً. سألتزم بهذه التعليمات بدقة." }] }
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
                    maxOutputTokens: 300
                }
            })
        });

        const data = await response.json();

        if (data.error) {
            return res.status(500).json({ error: data.error.message });
        }

        if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
            const reply = data.candidates[0].content.parts[0].text;
            return res.status(200).json({ reply });
        } else {
            return res.status(500).json({ error: 'AI service failed to generate a response.' });
        }

    } catch (error) {
        return res.status(500).json({ error: 'Failed to connect to AI service.' });
    }
}
