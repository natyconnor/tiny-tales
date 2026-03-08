const getSentences = (text: string): string[] => {
  const sentences: string[] = [];
  let current = "";

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    current += char;

    if (!/[.!?]/.test(char)) {
      continue;
    }

    // Keep closing quotes/brackets with the sentence-ending punctuation so
    // dialogue like `"Play?"` stays on the same page segment.
    while (index + 1 < text.length && /["'”’)\]]/.test(text[index + 1])) {
      index += 1;
      current += text[index];
    }

    const sentence = current.trim();
    if (sentence) {
      sentences.push(sentence);
    }
    current = "";
  }

  const trailingText = current.trim();
  if (trailingText) {
    sentences.push(trailingText);
  }

  return sentences.length > 0 ? sentences : [text.trim()];
};

export const splitStoryIntoSegments = (
  text: string,
  numSegments: number
): string[] => {
  const sentences = getSentences(text);

  // If fewer sentences than segments, give each sentence its own segment
  if (sentences.length <= numSegments) {
    return sentences.map((s) => s.trim());
  }

  // Distribute sentences evenly: base amount per segment, remainder to earlier segments
  // This ensures every segment gets at least one sentence
  const base = Math.floor(sentences.length / numSegments);
  const remainder = sentences.length % numSegments;

  const segments: string[] = [];
  let index = 0;

  for (let i = 0; i < numSegments; i += 1) {
    // Earlier segments get one extra sentence if there's a remainder
    const count = base + (i < remainder ? 1 : 0);
    const segment = sentences.slice(index, index + count).join(" ").trim();
    segments.push(segment);
    index += count;
  }

  return segments;
};
