import type { PhonicsStage } from "./stages.js";

export const IMAGE_STYLE_PREFIX =
  "whimsical watercolor children's book illustration, no text, no letters, not photoreal";

export const STORY_SYSTEM_PROMPT = `You write decodable early-reader pages.
Use ONLY the allowed words, sight words, and names.
One idea per sentence. Repeat sentence frames when it helps.
Do not add a moral in words the child cannot read.
The picture will carry extra feeling and setting.
Return JSON only.`;

export function buildStoryUserPrompt(
  topic: string,
  stage: PhonicsStage,
  repairHint?: string
): string {
  const allowed = [
    ...stage.sightWords,
    ...stage.names,
    ...stage.wordBank,
  ].join(", ");

  return `Tell a 4-page story about this idea, using only allowed words:
${topic}

Do not copy the idea wording. Retell it with the word list.

LEVEL: ${stage.name}
${stage.summary}
Max letters per word: ${stage.maxLetters}
${stage.sentenceLength}
${stage.sentenceCount}

Sentence frames you may reuse:
${stage.frames.map((frame) => `- ${frame}`).join("\n")}

Examples of a legal story:
${stage.fewShots.map((line) => `- ${line}`).join("\n")}

ALLOWED WORDS:
${allowed}

${repairHint ? `FIX:\n${repairHint}\n` : ""}
Return JSON with this shape:
{"title":"2-5 simple words","pages":[{"text":"page 1"},{"text":"page 2"},{"text":"page 3"},{"text":"page 4"}]}`;
}

export function buildArtUserPrompt(
  title: string,
  pages: string[]
): string {
  const pageList = pages
    .map((page, index) => `Page ${index + 1}: ${page}`)
    .join("\n");

  return `The story "${title}" is locked. Write visual character sheets and 4 illustration scenes, one per page.

${pageList}

Characters may use any descriptive words. Story text stays unchanged.

Each image prompt should describe the scene in plain English (setting, action, faces). Do not start with a style prefix.

Return JSON:
{"characters":{"Name":"full visual description"},"imagePrompts":["scene 1","scene 2","scene 3","scene 4"]}`;
}

export function injectImagePrompt(
  scene: string,
  characters: Record<string, string>
): string {
  const sheets = Object.values(characters)
    .map((value) => value.trim())
    .filter(Boolean)
    .join("; ");
  const cleaned = scene
    .replace(/^whimsical watercolor[^:]*:\s*/i, "")
    .trim();

  if (sheets) {
    return `${IMAGE_STYLE_PREFIX}: ${sheets}. ${cleaned}`;
  }
  return `${IMAGE_STYLE_PREFIX}: ${cleaned}`;
}
