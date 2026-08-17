import { getCookie, readSessionToken } from './_session.js';

function jsonError(res, status, error) { return res.status(status).json({ success: false, error }); }
function safePath(value) { return String(value || '').replace(/[^a-zA-Z0-9._\-/]/g, '_').replace(/\.\./g, '_'); }

export default async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') return jsonError(res, 405, 'Method not allowed');
    const token = getCookie(req, 'polyglots_session');
    const user = readSessionToken(token);
    if (!user || user.username !== 'يوسف' || user.isAdmin !== true) return jsonError(res, 403, 'Admin access required');
    const githubToken = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER || 'polygotsacademy-cmd';
    const repo = process.env.GITHUB_REPO || 'poly';
    const branch = process.env.GITHUB_BRANCH || 'main';
    if (!githubToken) return jsonError(res, 503, 'GITHUB_TOKEN is not configured in Vercel');
    const { path, contentBase64, message, sha } = req.body || {};
    const cleanPath = safePath(path);
    if (!cleanPath.startsWith('public/')) return jsonError(res, 400, 'File path must be inside public/');
    if (!contentBase64 || contentBase64.length > 12_000_000) return jsonError(res, 400, 'File is missing or too large');
    const encodedPath = cleanPath.split('/').map(encodeURIComponent).join('/');
    const apiUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}`;
    const headers = { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' };
    let existingSha = sha;
    if (!existingSha) {
        const existing = await fetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, { headers });
        if (existing.ok) existingSha = (await existing.json()).sha;
    }
    const response = await fetch(apiUrl, { method: 'PUT', headers, body: JSON.stringify({ message: message || `Add academy asset ${cleanPath}`, content: contentBase64, branch, ...(existingSha ? { sha: existingSha } : {}) }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return jsonError(res, response.status, data.message || 'GitHub upload failed');
    return res.status(200).json({ success: true, path: cleanPath, publicUrl: `/${cleanPath.replace(/^public\//, '')}`, commit: data.commit?.sha || null });
}
