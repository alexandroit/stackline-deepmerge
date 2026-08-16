import { readdir, readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const docs = new URL('../docs/', import.meta.url);
const rootFiles = (await readdir(root))
  .filter((file) => file.endsWith('.md'))
  .map((file) => new URL(file, root));
const docFiles = (await readdir(docs))
  .filter((file) => file.endsWith('.md'))
  .map((file) => new URL(file, docs));
const failures = [];

for (const file of rootFiles.concat(docFiles)) {
  const contents = await readFile(file, 'utf8');
  const name = file.pathname.slice(root.pathname.length);
  const lines = contents.split('\n');
  let fenced = false;
  let h1Count = 0;

  if (!contents.endsWith('\n')) failures.push(`${name}: missing final newline`);

  lines.forEach((line, index) => {
    const number = index + 1;
    if (line.startsWith('```')) fenced = !fenced;
    if (!fenced && line.startsWith('# ')) h1Count += 1;
    if (/[ \t]+$/.test(line)) failures.push(`${name}:${number}: trailing whitespace`);
    if (line.includes('\t')) failures.push(`${name}:${number}: tab character`);
    if (!fenced && /^\s*(?:[-*]\s+)?https?:\/\/\S+\s*$/.test(line)) {
      failures.push(`${name}:${number}: use a descriptive Markdown link`);
    }
  });

  if (h1Count !== 1) failures.push(`${name}: expected one H1, found ${h1Count}`);
  if (fenced) failures.push(`${name}: unclosed fenced code block`);
}

if (failures.length > 0) {
  throw new Error(`Markdown checks failed:\n${failures.join('\n')}`);
}

console.log(`Markdown checks passed for ${rootFiles.length + docFiles.length} files`);
