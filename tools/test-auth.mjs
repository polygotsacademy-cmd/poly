import loginHandler from '../api/login.js';
import sessionHandler from '../api/session.js';
import logoutHandler from '../api/logout.js';

process.env.SESSION_SECRET = 'local-test-session-secret-please-replace-in-vercel-123456';

function makeResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) { this.statusCode = code; return this; },
    setHeader(name, value) { this.headers[name] = value; },
    json(value) { this.body = value; return this; }
  };
}

const loginReq = {
  method: 'POST',
  body: { username: 'admin', password: 'admin', remember: true },
  headers: { 'x-forwarded-proto': 'http' }
};
const loginRes = makeResponse();
await loginHandler(loginReq, loginRes);
if (loginRes.statusCode !== 200 || loginRes.body?.success !== true) throw new Error('Login test failed');
const cookie = loginRes.headers['Set-Cookie'];
if (!cookie || !cookie.startsWith('polyglots_session=')) throw new Error('Session cookie missing');

const studentLoginRes = makeResponse();
await loginHandler({
  method: 'POST',
  body: { username: 'يوسف', password: '0338', remember: false },
  headers: { 'x-forwarded-proto': 'http' }
}, studentLoginRes);
if (studentLoginRes.statusCode !== 200 || studentLoginRes.body?.user?.username !== 'يوسف' || studentLoginRes.body?.user?.isAdmin !== true) throw new Error('Student/admin login compatibility test failed');

const sessionReq = { method: 'GET', headers: { cookie, 'x-forwarded-proto': 'http' } };
const sessionRes = makeResponse();
await sessionHandler(sessionReq, sessionRes);
if (sessionRes.statusCode !== 200 || sessionRes.body?.user?.isAdmin !== true) throw new Error('Session restore test failed');

const invalidSessionRes = makeResponse();
await sessionHandler({ method: 'GET', headers: { cookie: 'polyglots_session=forged.invalid', 'x-forwarded-proto': 'http' } }, invalidSessionRes);
if (invalidSessionRes.statusCode !== 401 || invalidSessionRes.body?.success !== false) throw new Error('Forged session should be rejected');

const logoutRes = makeResponse();
await logoutHandler({ method: 'POST', headers: { 'x-forwarded-proto': 'http' } }, logoutRes);
if (logoutRes.statusCode !== 200 || !String(logoutRes.headers['Set-Cookie']).includes('Max-Age=0')) throw new Error('Logout test failed');

console.log('auth flow passed:', { login: loginRes.body.user, studentLoginPreserved: studentLoginRes.body.user, cookieHttpOnly: cookie.includes('HttpOnly'), session: sessionRes.body.user, logoutClearsCookie: true, forgedSessionRejected: true });
