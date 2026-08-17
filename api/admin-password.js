import crypto from 'crypto';
import { getCookie, readSessionToken } from './_session.js';

function hashPassword(password) { return crypto.scryptSync(password, process.env.PASSWORD_SALT || 'polyglots-password-salt', 32).toString('hex'); }
function githubHeaders() { return { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' }; }

export default async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
    const user = readSessionToken(getCookie(req, 'polyglots_session'));
    if (!user || user.username !== 'يوسف' || user.isAdmin !== true) return res.status(403).json({ success: false, error: 'Admin access required' });
    const { username, newPassword } = req.body || {};
    if (!username || !newPassword || String(newPassword).length < 4) return res.status(400).json({ success: false, error: 'Username and a password of at least 4 characters are required' });
    if (!process.env.GITHUB_TOKEN) return res.status(503).json({ success: false, error: 'GITHUB_TOKEN is not configured in Vercel' });
    const owner = process.env.GITHUB_OWNER || 'polygotsacademy-cmd';
    const repo = process.env.GITHUB_REPO || 'poly';
    const branch = process.env.GITHUB_BRANCH || 'main';
    const filePath = 'api/password-overrides.json';
    const apiUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${filePath}`;
    const headers = githubHeaders();
    const existing = await fetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, { headers });
    const existingData = existing.ok ? await existing.json() : null;
    let overrides = {};
    if (existingData?.content) { try { overrides = JSON.parse(Buffer.from(existingData.content, 'base64').toString('utf8')); } catch { overrides = {}; } }
    overrides[username] = hashPassword(String(newPassword));
    const content = Buffer.from(JSON.stringify(overrides, null, 2) + '\n').toString('base64');
    const response = await fetch(apiUrl, { method: 'PUT', headers, body: JSON.stringify({ message: `Update password override for ${username}`, content, branch, ...(existingData?.sha ? { sha: existingData.sha } : {}) }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return res.status(response.status).json({ success: false, error: data.message || 'Password update commit failed' });
    return res.status(200).json({ success: true, redeployRequired: true });
}
