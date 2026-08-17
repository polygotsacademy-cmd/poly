import crypto from 'crypto';

const SESSION_COOKIE = 'polyglots_session';
const DEFAULT_SESSION_DAYS = 1;

function getSessionSecret() {
    const secret = process.env.SESSION_SECRET;
    if (!secret || secret.length < 32) {
        throw new Error('SESSION_SECRET must be configured with at least 32 characters.');
    }
    return secret;
}

function base64Url(value) {
    return Buffer.from(value).toString('base64url');
}

function sign(value) {
    return crypto.createHmac('sha256', getSessionSecret()).update(value).digest('base64url');
}

export function createSessionToken(user, remember = false) {
    const now = Math.floor(Date.now() / 1000);
    const maxAge = remember ? 30 * 24 * 60 * 60 : DEFAULT_SESSION_DAYS * 24 * 60 * 60;
    const payload = base64Url(JSON.stringify({
        user,
        iat: now,
        exp: now + maxAge
    }));
    return `${payload}.${sign(payload)}`;
}

export function readSessionToken(token) {
    if (!token || typeof token !== 'string') return null;
    const [payload, signature] = token.split('.');
    if (!payload || !signature) return null;

    const expected = sign(payload);
    const givenBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (givenBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(givenBuffer, expectedBuffer)) {
        return null;
    }

    try {
        const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
        if (!data.exp || data.exp <= Math.floor(Date.now() / 1000) || !data.user?.username) return null;
        return data.user;
    } catch {
        return null;
    }
}

export function getCookie(req, name) {
    const header = req.headers?.cookie || '';
    const cookies = header.split(';').map(part => part.trim());
    const prefix = `${name}=`;
    const found = cookies.find(cookie => cookie.startsWith(prefix));
    return found ? decodeURIComponent(found.slice(prefix.length)) : null;
}

function cookieSecurity(req) {
    const forwardedProto = req.headers?.['x-forwarded-proto'];
    const isHttps = forwardedProto === 'https' || process.env.NODE_ENV === 'production';
    return isHttps ? '; Secure' : '';
}

export function setSessionCookie(res, token, req, remember = false) {
    const maxAgePart = remember ? `; Max-Age=${30 * 24 * 60 * 60}` : '';
    res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${encodeURIComponent(token)}${maxAgePart}; Path=/; HttpOnly; SameSite=Lax${cookieSecurity(req)}`);
}

export function clearSessionCookie(res, req) {
    res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax${cookieSecurity(req)}`);
}

export { SESSION_COOKIE };
