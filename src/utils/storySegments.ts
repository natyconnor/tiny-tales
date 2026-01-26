export const splitStoryIntoSegments = (
  text: string,
  numSegments: number
): string[] => {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

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
