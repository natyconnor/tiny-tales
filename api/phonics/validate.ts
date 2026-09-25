import {
  getAllowedWordSet,
  type PhonicsStage,
  type PhonicsStageId,
} from "./stages.js";

export type StoryToken = {
  raw: string;
  word: string;
};

export type IllegalWord = {
  word: string;
  reason: string;
};

const CONTRACTION_SUFFIXES = ["n't", "'s", "'ll", "'re", "'ve", "'d"];

const VOWEL_TEAMS = /ai|ay|ea|ee|ie|oa|oe|ue|ui|au|aw|oo|ew/i;
const DIPHTHONGS = /ou|ow|oi|oy/i;
const R_CONTROLLED = /ar|or|er|ir|ur/i;
const IGH = /igh/i;
const INITIAL_BLEND =
  /^(bl|br|cl|cr|dr|fl|fr|gl|gr|pl|pr|sc|sk|sl|sm|sn|sp|st|sw|tr|tw)/i;
const FINAL_BLEND = /(ck|ll|ss|ff|zz|nd|nt|mp|st|lt|ft|sk|lp|nk|ng)$/i;
const DIGRAPH = /^(sh|ch|th|wh|qu)|sh$|ch$|th$/i;
const SILENT_E = /^[bcdfghjklmnpqrstvwxyz]+[aeiou][bcdfghjklmnpqrstvwxyz]e$/i;
const CVC = /^[bcdfghjklmnpqrstvwxyz][aeiou][bcdfghjklmnpqrstvwxyz]$/i;
const TWO_LETTER_SHORT = /^(an|am|at|if|in|on|up|it|us|ox)$/i;
const Y_ENDING = /^[bcdfghjklmnpqrstvwxyz][aeiou][bcdfghjklmnpqrstvwxyz]{1,2}y$/i;
const ING_ED = /(ing|ed)$/i;

export function tokenizeStory(text: string): StoryToken[] {
  const parts = text.split(/(\s+)/);
  const tokens: StoryToken[] = [];

  for (const part of parts) {
    if (!part.trim() || /^\s+$/.test(part)) continue;

    const stripped = part.replace(/^[^A-Za-z']+|[^A-Za-z']+$/g, "");
    if (!stripped || !/[A-Za-z]/.test(stripped)) continue;

    tokens.push({
      raw: part,
      word: normalizeWord(stripped),
    });
  }

  return tokens;
}

export function normalizeWord(raw: string): string {
  let word = raw.toLowerCase().replace(/’/g, "'");

  for (const suffix of CONTRACTION_SUFFIXES) {
    if (word.endsWith(suffix) && word.length > suffix.length) {
      word = word.slice(0, -suffix.length);
      break;
    }
  }

  return word.replace(/[^a-z]/g, "");
}

export function letterCount(word: string): number {
  return word.replace(/[^a-z]/gi, "").length;
}

export function matchesStagePattern(
  word: string,
  maxLetters: PhonicsStageId
): boolean {
  if (!word || letterCount(word) > maxLetters) return false;
  if (TWO_LETTER_SHORT.test(word) || CVC.test(word)) return true;

  if (maxLetters <= 3) return false;

  const hasVowelTeam = VOWEL_TEAMS.test(word);
  const hasDiphthong = DIPHTHONGS.test(word);
  const hasRControlled = R_CONTROLLED.test(word);
  const hasSilentE = SILENT_E.test(word);
  const hasBlend = INITIAL_BLEND.test(word) || FINAL_BLEND.test(word);
  const hasDigraph = DIGRAPH.test(word);

  if (maxLetters === 4) {
    if (hasSilentE || hasVowelTeam || hasDiphthong || hasRControlled) {
      return false;
    }
    if (hasDigraph && !FINAL_BLEND.test(word)) return false;
    return hasBlend || /s$/.test(word);
  }

  if (maxLetters === 5) {
    if (hasVowelTeam || hasDiphthong || hasRControlled || IGH.test(word)) {
      return false;
    }
    return hasSilentE || hasDigraph || hasBlend || Y_ENDING.test(word);
  }

  if (maxLetters === 6) {
    if (hasDiphthong && !/ow/i.test(word)) return false;
    return (
      hasSilentE ||
      hasDigraph ||
      hasBlend ||
      hasVowelTeam ||
      hasRControlled ||
      IGH.test(word) ||
      Y_ENDING.test(word) ||
      ING_ED.test(word)
    );
  }

  return true;
}

export function findIllegalWords(
  text: string,
  stage: PhonicsStage
): IllegalWord[] {
  const allowed = getAllowedWordSet(stage);
  const seen = new Set<string>();
  const illegal: IllegalWord[] = [];

  for (const token of tokenizeStory(text)) {
    const word = token.word;
    if (!word || seen.has(word)) continue;
    seen.add(word);

    if (allowed.has(word)) continue;

    if (letterCount(word) > stage.maxLetters) {
      illegal.push({
        word,
        reason: `${word} has ${letterCount(word)} letters (max ${stage.maxLetters})`,
      });
      continue;
    }

    if (matchesStagePattern(word, stage.maxLetters)) continue;

    illegal.push({
      word,
      reason: `${word} is not a ${stage.maxLetters}-letter decodable or sight word`,
    });
  }

  return illegal;
}

export function buildRepairHint(illegal: IllegalWord[]): string {
  if (illegal.length === 0) return "";

  const list = illegal
    .slice(0, 12)
    .map((item) => item.word)
    .join(", ");

  return `These words are not allowed: ${list}. Replace each one with a word from the allowed list. Keep the same story.`;
}
