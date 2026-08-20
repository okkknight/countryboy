export function splitMathSegments(text) {
  const segments = [];
  const pattern = /\$([^$\n]+?)\$/g;
  let cursor = 0;

  for (const match of text.matchAll(pattern)) {
    if (match.index > cursor) {
      segments.push({ type: 'text', value: text.slice(cursor, match.index) });
    }
    segments.push({ type: 'math', value: match[1], display: false });
    cursor = match.index + match[0].length;
  }

  if (cursor < text.length || segments.length === 0) {
    segments.push({ type: 'text', value: text.slice(cursor) });
  }
  return segments;
}
