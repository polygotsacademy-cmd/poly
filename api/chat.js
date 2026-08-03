export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { message, history, mode } = req.body;
    const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY; // Use available key

    if (!apiKey) {
        return res.status(500).json({ error: 'API Key is not configured.' });
    }

    if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Invalid or missing message' });
    }

    // Define System Prompts based on Mode
    const prompts = {
        teacher: `Act as a friendly German teacher strictly following the "Deutschprofis A1.1 and A1.2" curriculum. 
        Explain grammar simply in Arabic (Egyptian dialect is preferred for friendliness). 
        Always encourage the student. Use bold text for German words and lists for clarity. 
        End your response with a simple German question.`,
        
        translator: `Translate between Arabic and German. 
        If translating a noun to German, you MUST provide the article (der/die/das) and the plural form.
        Example: 
        User: "كتاب"
        Response: "das Buch (Plural: die Bücher)"
        Provide only the translation without extra chatter.`,
        
        homework: `Act as a home tutor for students studying "Deutschprofis A1.1 and A1.2". 
        First, ask the student for the page and exercise number they are working on. 
        CRITICAL RULE: NEVER give direct answers to homework. 
        Instead, give hints, remind them of the relevant grammar rule from the curriculum, and guide them to find the answer themselves. 
        Explain in Arabic.`,
        
        roleplay: `Act as a conversation partner for an A1 German student. 
        Initiate simple roleplays based on A1 topics like family, food, hobbies, or shopping. 
        Speak ONLY in simple German. 
        Ask only ONE question at a time and wait for the student's reply. 
        Keep your sentences short and appropriate for A1 level.`,
        
        corrector: `The student will provide German sentences. 
        Your job is to correct any grammatical or spelling mistakes. 
        Explain the correction briefly in Arabic based on A1 rules from the "Deutschprofis" curriculum. 
        Show the corrected sentence clearly in bold.`
    };

    const systemPrompt = prompts[mode] || prompts.teacher;

    try {
        // Use Gemini API as in the original code, but with fallback or simplified logic
        const model = 'gemini-1.5-flash'; // Using a stable model
        
        let contents = [
            { role: 'user', parts: [{ text: `System Instruction: ${systemPrompt}` }] },
            { role: 'model', parts: [{ text: "Understood. I will act according to these instructions." }] }
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
                    maxOutputTokens: 500
                }
            })
        });

        const data = await response.json();

        if (data.error) {
            console.error('API Error:', data.error);
            return res.status(500).json({ error: data.error.message });
        }

        if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
            const reply = data.candidates[0].content.parts[0].text;
            return res.status(200).json({ reply });
        } else {
            return res.status(500).json({ error: 'AI service failed to generate a response.' });
        }

    } catch (error) {
        console.error('Fetch Error:', error);
        return res.status(500).json({ error: 'Failed to connect to AI service.' });
    }
}
