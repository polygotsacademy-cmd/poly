export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { message, history, mode } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ 
            error: 'لم يتم إعداد مفتاح API (GEMINI_API_KEY). يرجى إضافته في إعدادات Vercel.' 
        });
    }

    if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'الرسالة غير صالحة.' });
    }

    if (message.length > 200) {
        return res.status(400).json({ error: 'الرسالة طويلة جداً (الحد الأقصى 200 حرف).' });
    }

    const prompts = {
        teacher: `أنت 'Polyglots AI'، مدرس ألماني ودود جداً للأطفال (عمر 10 سنوات). 
        مهمتك: شرح اللغة الألمانية ببساطة شديدة باستخدام العامية المصرية المحببة للأطفال.
        قواعدك:
        1. ممنوع تماماً الكلام في أي موضوع خارج تعلم اللغة الألمانية.
        2. استخدم الرموز التعبيرية (Emojis) بكثرة.
        3. اجعل إجاباتك قصيرة ومنظمة.
        4. في نهاية كل رد، اسأل الطفل سؤالاً بسيطاً بالألمانية.`,
        
        translator: `أنت مترجم دقيق بين العربية والألمانية.
        قواعدك:
        1. ممنوع الكلام في أي شيء خارج الترجمة.
        2. إذا كانت الكلمة اسماً، اذكر الأداة (der/die/das) والجمع.`
    };

    const systemPrompt = prompts[mode] || prompts.teacher;

    try {
        // استخدام الإصدار المستقر v1 واسم النموذج الصحيح
        const model = 'gemini-1.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;
        
        let contents = [
            {
                role: 'user',
                parts: [{ text: `System Instruction: ${systemPrompt}` }]
            },
            {
                role: 'model',
                parts: [{ text: "فهمت تماماً. سألتزم بهذه التعليمات بدقة." }]
            }
        ];

        if (history && Array.isArray(history)) {
            // تنظيف التاريخ وإرسال آخر 6 رسائل فقط للحفاظ على التوكنز
            const recentHistory = history.slice(-6).map(msg => ({
                role: msg.role === 'ai' ? 'model' : 'user',
                parts: [{ text: msg.content }]
            }));
            contents.push(...recentHistory);
        }

        // إضافة الرسالة الحالية
        contents.push({
            role: 'user',
            parts: [{ text: message }]
        });

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: contents,
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 300,
                    topP: 0.8,
                    topK: 40
                }
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Gemini API Error:', data);
            return res.status(response.status).json({ 
                error: data.error?.message || 'فشل الاتصال بـ Google Gemini API.' 
            });
        }

        if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
            const reply = data.candidates[0].content.parts[0].text;
            return res.status(200).json({ reply });
        } else {
            return res.status(500).json({ error: 'لم يتمكن الذكاء الاصطناعي من توليد رد مناسب.' });
        }

    } catch (error) {
        console.error('Fetch Error:', error);
        return res.status(500).json({ error: 'حدث خطأ داخلي أثناء معالجة الطلب.' });
    }
}
