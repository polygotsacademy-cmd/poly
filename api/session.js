import { getCookie, readSessionToken, SESSION_COOKIE } from './_session.js';

export default function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    res.setHeader('Cache-Control', 'no-store');
    try {
        const user = readSessionToken(getCookie(req, SESSION_COOKIE));
        if (!user) {
            return res.status(401).json({ success: false, error: 'Not authenticated' });
        }
        return res.status(200).json({ success: true, user });
    } catch (error) {
        console.error('Session validation error:', error.message);
        return res.status(500).json({ success: false, error: 'Session service is not configured.' });
    }
}
