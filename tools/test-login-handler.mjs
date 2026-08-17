import handler from '../api/login.js';
const req = { method: 'POST', body: { username: '__diagnostic__', password: '__diagnostic__', remember: false }, headers: {} };
const response = { headers: {}, statusCode: 200, setHeader(k,v){this.headers[k]=v;}, status(n){this.statusCode=n; return this;}, json(body){this.body=body; return this;} };
try { await handler(req, response); console.log(JSON.stringify({ status: response.statusCode, body: response.body, headers: response.headers })); } catch (error) { console.error(error.stack || error); process.exit(1); }
