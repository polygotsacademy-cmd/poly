const { GoogleGenerativeAI } = require("@google/generative-ai");

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { mode, text, image, audio, history } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'Gemini API Key is not configured.' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // System Prompts for different modes
    const prompts = {
        translator: `أنت 'Polyglots AI' مترجم متخصص. \nالمهمة: ترجمة النصوص بين العامية المصرية واللغة الألمانية (مستوى A1-A2).\nالقاعدة: ترجم فقط! لا تشرح، لا ترحب، لا تضف أي كلام جانبي.\nإذا كانت الكلمة اسماً بالألماني، أضف أداة التعريف (der/die/das) والجمع.`,
        
        teacher: `أنت 'Polyglots AI' مدرس ألماني خبير في منهج Deutschprofis A1.1 & A1.2.\nاللغة: تحدث بالعامية المصرية للشرح وبالألمانية البسيطة للأمثلة.\nالمهمة: اشرح القواعد بأسلوب شيق وبسيط. استخدم أمثلة من واقع المنهج.\nالقيود: لا تخرج عن نطاق مستوى A1-A2. التزم بالدروس التالية:\n\n📘 Deutschprofis A1.1\n1. Lektion 1 – So klingt Deutsch\n2. Lektion 2 – Hallo, das bin ich!\n3. Lektion 3 – Das mache ich gern\n4. Lektion 4 – Meine Familie\n5. Lektion 5 – Daher komme ich\n6. Lektion 6 – Meine Schulsachen\n\n📗 Deutschprofis A1.2\n7. Lektion 7 – Mein Haus, meine Stadt\n8. Lektion 8 – Meine Woche\n9. Lektion 9 – Meine Freizeit\n10. Lektion 10 – Mein Geburtstag\n11. Lektion 11 – Meine Lieblingstiere\n12. Lektion 12 – Mein Jahr`,
        
        homework: `أنت 'Polyglots AI' مساعد في حل الواجب.\nالمهمة: إذا أرسل الطالب صورة واجب أو سأل عن سؤال، قم بتوجيهه وفهمه القاعدة بالعامية المصرية.\nالقاعدة الذهبية: ممنوع تماماً إعطاء الإجابة النهائية مباشرة. ساعده ليصل للحل بنفسه من خلال تلميحات وشرح القاعدة.`,
        
        voice: `أنت 'Polyglots AI' خبير صوتيات ونطق.\nالمهمة: تحليل النطق والقواعد في التسجيلات الصوتية الألمانية التي يرسلها الطالب.\nالرد: بالعامية المصرية، وضح له نقاط القوة والضعف في نطقه، وصحح له الأخطاء اللغوية.\nالتنسيق: استخدم Markdown لتنسيق التصحيحات بشكل جميل وواضح.`
    };

    const systemPrompt = prompts[mode] || prompts.teacher;
    const fullSystemPrompt = `${systemPrompt}\n\nاللغة المستخدمة للرد: العامية المصرية + ألماني (A1-A2) فقط. Your responses MUST be concise and NEVER exceed 300 words.`

    // Prepare content parts
    const parts = [];
    if (text) parts.push({ text: text });
    
    if (image) {
        const [mime, data] = image.split(';base64,');
        parts.push({
            inlineData: {
                mimeType: mime.split(':')[1],
                data: data
            }
        });
    }

    if (audio) {
        const [mime, data] = audio.split(';base64,');
        parts.push({
            inlineData: {
                mimeType: mime.split(':')[1],
                data: data
            }
        });
    }

    // Format history for the SDK
    const chatHistory = [];
    if (history && Array.isArray(history)) {
        history.forEach(msg => {
            const hParts = [];
            if (msg.content) hParts.push({ text: msg.content });
            if (msg.image) {
                const [mime, data] = msg.image.split(';base64,');
                hParts.push({ inlineData: { mimeType: mime.split(':')[1], data: data } });
            }
            if (msg.audio) {
                const [mime, data] = msg.audio.split(';base64,');
                hParts.push({ inlineData: { mimeType: mime.split(':')[1], data: data } });
            }
            
            if (hParts.length > 0) {
                chatHistory.push({
                    role: msg.role === 'ai' ? 'model' : 'user',
                    parts: hParts
                });
            }
        });
    }

    // Updated model list based on latest 2026 availability
    const modelsToTry = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-2.5-flash', 'gemini-1.5-flash'];
    let reply = null;

    for (const modelName of modelsToTry) {
        try {
            const model = genAI.getGenerativeModel({ 
                model: modelName,
                systemInstruction: fullSystemPrompt
            });
            
            let result;
            if (chatHistory.length > 0) {
                const chat = model.startChat({
                    history: chatHistory,
                    generationConfig: {
                        maxOutputTokens: 800,
                        temperature: 0.7,
                    },
                });
                result = await chat.sendMessage(parts);
            } else {
                result = await model.generateContent({
                    contents: parts,
                    generationConfig: {
                        maxOutputTokens: 800,
                        temperature: 0.7,
                    },
                });
            }

            const response = await result.response;
            reply = response.text();
            
            if (reply) {
                console.log(`Successfully used model: ${modelName}`);
                break;
            }
        } catch (error) {
            console.error(`Error with model ${modelName}:`, error.message);
            // Continue to next model
        }
    }

    if (reply) {
        return res.status(200).json({ reply });
    } else {
        return res.status(500).json({ error: 'AI service temporarily unavailable. All models failed.' });
    }
}
