import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = '/home/ubuntu/myapp-refactor';
const sourcePath = path.join(root, '_original_snapshot', 'app.js.original');
const outputDir = path.join(root, 'public', 'modules');
const htmlPath = path.join(root, 'public', 'index.html');

const source = await readFile(sourcePath, 'utf8');

function sliceBetween(startMarker, endMarker) {
  const start = startMarker ? source.indexOf(startMarker) : 0;
  const end = endMarker ? source.indexOf(endMarker, start) : source.length;
  if (start < 0 || end < 0 || end <= start) {
    throw new Error(`Unable to split section from ${startMarker} to ${endMarker}`);
  }
  return source.slice(start, end).trim() + '\n';
}

const sections = [
  ['00-core.js', null, '// View Switching'],
  ['01-router.js', '// View Switching', 'function escapeAnnouncementHtml'],
  ['02-announcements.js', 'function escapeAnnouncementHtml', 'function renderMessagesView'],
  ['03-messages-view.js', 'function renderMessagesView', 'function renderWordsView'],
  ['04-vocabulary.js', 'function renderWordsView', 'function renderStoriesView'],
  ['05-stories.js', 'function renderStoriesView', 'function renderQuizzesView'],
  ['06-quizzes.js', 'function renderQuizzesView', 'function getDailyUsage'],
  ['07-ai-chat.js', 'function getDailyUsage', 'function renderGamesView'],
  ['08-games-theme.js', 'function renderGamesView', '// Real-time Messaging Functions'],
  ['09-direct-messages.js', '// Real-time Messaging Functions', '// --- MASCOT LOGIC ---'],
  ['10-mascots.js', '// --- MASCOT LOGIC ---', '// --- GAMIFICATION SYSTEM ---'],
  ['11-gamification.js', '// --- GAMIFICATION SYSTEM ---', 'function toggleModeDropdown'],
  ['12-chat-dropdown.js', 'function toggleModeDropdown', null]
];

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

for (const [filename, startMarker, endMarker] of sections) {
  const body = sliceBetween(startMarker, endMarker);
  const header = `/* Polyglots current site — ${filename}. Keep this file as a classic script; inline handlers in the existing HTML depend on its global functions. */\n\n`;
  await writeFile(path.join(outputDir, filename), header + body, 'utf8');
}

const loader = sections
  .map(([filename]) => `    <script src="modules/${filename}"></script>`)
  .join('\n');
const replacement = loader;

const html = await readFile(htmlPath, 'utf8');
const originalScriptTag = '    <script src="app.js"></script>';
const alreadySplit = html.includes('    <script src="modules/00-core.js"></script>')
  && html.includes('    <script src="modules/12-chat-dropdown.js"></script>');

if (!html.includes(originalScriptTag) && !alreadySplit) {
  throw new Error('Expected either the original app.js script tag or the existing module loader in index.html');
}

await writeFile(
  htmlPath,
  html.includes(originalScriptTag) ? html.replace(originalScriptTag, replacement) : html,
  'utf8'
);

await writeFile(path.join(root, 'public', 'app.js'), `/*\n * Legacy entry retained as a marker after the safe split.\n * The live page now loads public/modules/00-core.js through 12-chat-dropdown.js from index.html.\n * Original source snapshot: _original_snapshot/app.js.original\n */\n`, 'utf8');

const manifest = {
  purpose: 'Safe behavioral split of the original app.js into classic scripts loaded in original order.',
  original: '_original_snapshot/app.js.original',
  modules: sections.map(([filename]) => filename),
  note: 'Do not change script order unless dependencies are audited. Keep functions global while legacy inline onclick handlers remain.'
};
await writeFile(path.join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');

console.log(`Created ${sections.length} JavaScript modules in ${outputDir}`);
