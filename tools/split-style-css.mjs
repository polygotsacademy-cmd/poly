import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = '/home/ubuntu/myapp-refactor';
const sourcePath = path.join(root, '_original_snapshot', 'style.css.original');
const outputDir = path.join(root, 'public', 'styles');
const htmlPath = path.join(root, 'public', 'index.html');
const source = await readFile(sourcePath, 'utf8');

function sliceBetween(startMarker, endMarker) {
  const start = startMarker ? source.indexOf(startMarker) : 0;
  const end = endMarker ? source.indexOf(endMarker, start) : source.length;
  if (start < 0 || end < 0 || end <= start) {
    throw new Error(`Unable to split style section from ${startMarker} to ${endMarker}`);
  }
  return source.slice(start, end).trim() + '\n';
}

const sections = [
  ['00-foundation.css', null, '/* Login Screen */'],
  ['01-shell.css', '/* Login Screen */', '/* Chat UI (old sizes restored) */'],
  ['02-learning.css', '/* Chat UI (old sizes restored) */', '/* Chat Header */'],
  ['03-stories-quizzes-games.css', '/* Chat Header */', '/* ===================== NEW CHAT V2 ===================== */'],
  ['04-ai-chat.css', '/* ===================== NEW CHAT V2 ===================== */', '/* --- Responsive Design Improvements --- */'],
  ['05-responsive.css', '/* --- Responsive Design Improvements --- */', '/* --- New Sidebar & Notification Styles --- */'],
  ['06-navigation.css', '/* --- New Sidebar & Notification Styles --- */', '/* --- Polyglots AI Chatbot Revamp --- */'],
  ['07-ai-chat-refinements.css', '/* --- Polyglots AI Chatbot Revamp --- */', '/* Real-time Messaging Split Layout Styles */'],
  ['08-messages-modals.css', '/* Real-time Messaging Split Layout Styles */', '/* Claude-like Minimalist Chat UI */'],
  ['09-chat-announcements.css', '/* Claude-like Minimalist Chat UI */', null]
];

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

for (const [filename, startMarker, endMarker] of sections) {
  const header = `/* Polyglots current site — ${filename}. This order is part of the existing visual cascade. */\n\n`;
  await writeFile(path.join(outputDir, filename), header + sliceBetween(startMarker, endMarker), 'utf8');
}

const links = sections
  .map(([filename]) => `    <link rel="stylesheet" href="styles/${filename}">`)
  .join('\n');

const html = await readFile(htmlPath, 'utf8');
if (!html.includes('    <link rel="stylesheet" href="style.css">')) {
  throw new Error('Expected original style.css link was not found in index.html');
}
await writeFile(htmlPath, html.replace('    <link rel="stylesheet" href="style.css">', links), 'utf8');

await writeFile(path.join(root, 'public', 'style.css'), `/*\n * Legacy entry retained as a marker after the safe split.\n * The live page now loads public/styles/00-foundation.css through 09-chat-announcements.css from index.html.\n * Original source snapshot: _original_snapshot/style.css.original\n */\n`, 'utf8');

await writeFile(path.join(outputDir, 'manifest.json'), JSON.stringify({
  purpose: 'Safe CSS split preserving original cascade order.',
  original: '_original_snapshot/style.css.original',
  styles: sections.map(([filename]) => filename),
  note: 'Do not reorder linked styles without testing visual regressions.'
}, null, 2) + '\n', 'utf8');

console.log(`Created ${sections.length} CSS files in ${outputDir}`);
