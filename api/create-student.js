import crypto from 'crypto';
import fs from 'fs';
import { getCookie, readSessionToken } from './_session.js';

function hashPassword(password) { return crypto.scryptSync(String(password), process.env.PASSWORD_SALT || 'polyglots-password-salt', 32).toString('hex'); }
function headers() { return { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' }; }
function readJsonFile(name, fallback) { try { return JSON.parse(fs.readFileSync(new URL(`./${name}`, import.meta.url), 'utf8')); } catch { return fallback; } }

export default async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
    const sessionUser = readSessionToken(getCookie(req, 'polyglots_session'));
    if (!sessionUser || sessionUser.username !== 'يوسف' || sessionUser.isAdmin !== true) return res.status(403).json({ success: false, error: 'Admin access required' });
    const { username, password, displayName, aiEnabled = true, visibleSections = [] } = req.body || {};
    const cleanUsername = String(username || '').trim();
    if (!/^[-_\p{L}\p{N}]{3,40}$/u.test(cleanUsername)) return res.status(400).json({ success: false, error: 'Username must contain 3-40 letters, numbers, hyphens, or underscores' });
    if (!password || String(password).length < 4) return res.status(400).json({ success: false, error: 'Password must contain at least 4 characters' });
    if (!process.env.GITHUB_TOKEN) return res.status(503).json({ success: false, error: 'GITHUB_TOKEN is not configured in Vercel' });
    const legacy = readJsonFile('legacy-usernames.json', []);
    if (legacy.includes(cleanUsername)) return res.status(409).json({ success: false, error: 'This username already exists' });
    const owner = process.env.GITHUB_OWNER || 'polygotsacademy-cmd';
    const repo = process.env.GITHUB_REPO || 'poly';
    const branch = process.env.GITHUB_BRANCH || 'main';
    const filePath = 'api/new-users.json';
    const apiUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${filePath}`;
    const apiHeaders = headers();
    const existingResponse = await fetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, { headers: apiHeaders });
    const existing = existingResponse.ok ? await existingResponse.json() : null;
    let registry = {};
    if (existing?.content) { try { registry = JSON.parse(Buffer.from(existing.content, 'base64').toString('utf8')); } catch { registry = {}; } }
    if (registry[cleanUsername]) return res.status(409).json({ success: false, error: 'This username already exists' });
    registry[cleanUsername] = { passwordHash: hashPassword(password), displayName: String(displayName || cleanUsername).trim(), chatName: String(displayName || cleanUsername).trim(), active: true, aiEnabled: Boolean(aiEnabled), visibleSections: Array.isArray(visibleSections) ? visibleSections : [], points: 0, payment_status: 'Paid' };
    const content = Buffer.from(JSON.stringify(registry, null, 2) + '\n').toString('base64');
    const response = await fetch(apiUrl, { method: 'PUT', headers: apiHeaders, body: JSON.stringify({ message: `Add student ${cleanUsername}`, content, branch, ...(existing?.sha ? { sha: existing.sha } : {}) }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return res.status(response.status).json({ success: false, error: data.message || 'Student creation commit failed' });
    return res.status(200).json({ success: true, username: cleanUsername, redeployRequired: true });
}
