const headingPattern = /^(#{1,3})\s+(.+)$/;
const unorderedListPattern = /^[-*+]\s+(.+)$/;
const orderedListPattern = /^\d+[.)]\s+(.+)$/;

function listMatch(line) {
  const unordered = line.match(unorderedListPattern);
  if (unordered) return { ordered: false, text: unordered[1] };

  const ordered = line.match(orderedListPattern);
  if (ordered) return { ordered: true, text: ordered[1] };

  return null;
}

function startsBlock(line) {
  return line === '```'
    || headingPattern.test(line)
    || line.startsWith('> ')
    || listMatch(line) !== null;
}

export function parseMarkdownBlocks(markdown) {
  const lines = String(markdown || '').replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];

  for (let index = 0; index < lines.length;) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (line === '```') {
      const codeLines = [];
      index += 1;
      while (index < lines.length && lines[index] !== '```') {
        codeLines.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push({ type: 'code', text: codeLines.join('\n') });
      continue;
    }

    const heading = line.match(headingPattern);
    if (heading) {
      blocks.push({ type: 'heading', level: heading[1].length, text: heading[2] });
      index += 1;
      continue;
    }

    if (line.startsWith('> ')) {
      const quoteLines = [];
      while (index < lines.length && lines[index].startsWith('> ')) {
        quoteLines.push(lines[index].slice(2));
        index += 1;
      }
      blocks.push({ type: 'quote', text: quoteLines.join('\n') });
      continue;
    }

    const firstListItem = listMatch(line);
    if (firstListItem) {
      const items = [];
      while (index < lines.length) {
        const item = listMatch(lines[index]);
        if (!item || item.ordered !== firstListItem.ordered) break;
        items.push(item.text);
        index += 1;
      }
      blocks.push({ type: 'list', ordered: firstListItem.ordered, items });
      continue;
    }

    const paragraphLines = [];
    while (index < lines.length && lines[index].trim() && !startsBlock(lines[index])) {
      paragraphLines.push(lines[index]);
      index += 1;
    }
    blocks.push({ type: 'paragraph', text: paragraphLines.join('\n') });
  }

  return blocks;
}
