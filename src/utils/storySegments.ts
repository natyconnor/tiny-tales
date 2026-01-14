export const splitStoryIntoSegments = (
  text: string,
  numSegments: number
): string[] => {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const segments: string[] = [];
  const sentencesPerSegment = Math.ceil(sentences.length / numSegments);

  for (let i = 0; i < numSegments; i += 1) {
    const start = i * sentencesPerSegment;
    const end = start + sentencesPerSegment;
    const segment = sentences.slice(start, end).join(" ").trim();
    if (segment) {
      segments.push(segment);
    }
  }

  return segments;
};
