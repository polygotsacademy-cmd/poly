import fs from 'fs';
import vm from 'vm';

const source = fs.readFileSync(new URL('../public/modules/09-direct-messages.js', import.meta.url), 'utf8');
const storedUsers = new Map();
const context = {
  console,
  window: {},
  currentUser: { username: 'test-user' },
  currentView: 'messages',
  currentChatUser: 'يوسف',
  db: {
    collection() {
      return {
        doc(username) {
          return {
            async get() {
              const data = storedUsers.get(username);
              return { exists: Boolean(data), data: () => data };
            }
          };
        }
      };
    },
    async runTransaction(callback) {
      const transaction = {
        async get() {
          const data = storedUsers.get('test-user');
          return { exists: Boolean(data), data: () => data };
        },
        set(_ref, patch) {
          storedUsers.set('test-user', { ...(storedUsers.get('test-user') || {}), ...patch });
        }
      };
      return callback(transaction);
    }
  },
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  alert() {}
};
vm.createContext(context);
vm.runInContext(source, context);

const firstText = await context.reserveChatUsage({ text: 1 });
if (!firstText.ok || storedUsers.get('test-user').chatUsage.text !== 1) throw new Error('First text reservation failed');

for (let i = 1; i < 20; i++) {
  const result = await context.reserveChatUsage({ text: 1 });
  if (!result.ok) throw new Error(`Text reservation ${i + 1} failed unexpectedly`);
}
const blockedText = await context.reserveChatUsage({ text: 1 });
if (blockedText.ok) throw new Error('21st text message should be blocked');

const image = await context.reserveChatUsage({ images: 1 });
if (!image.ok || storedUsers.get('test-user').chatUsage.images !== 1) throw new Error('Image reservation failed');

for (let i = 1; i < 5; i++) {
  const result = await context.reserveChatUsage({ audio: 1 });
  if (!result.ok) throw new Error(`Audio reservation ${i + 1} failed unexpectedly`);
}
const blockedAudio = await context.reserveChatUsage({ audio: 1 });
if (blockedAudio.ok) throw new Error('5th audio message should be blocked');

console.log('poly chat quota transaction tests passed', storedUsers.get('test-user').chatUsage);
