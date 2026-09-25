export type PhonicsStageId = 3 | 4 | 5 | 6 | 7 | 8;

export type PhonicsStage = {
  maxLetters: PhonicsStageId;
  name: string;
  summary: string;
  sentenceLength: string;
  sentenceCount: string;
  frames: string[];
  fewShots: string[];
  sightWords: string[];
  names: string[];
  wordBank: string[];
};

const NAMES = [
  "Sam",
  "Mat",
  "Mag",
  "Max",
  "Meg",
  "Tim",
  "Tom",
  "Ted",
  "Kit",
  "Kim",
  "Ben",
  "Dan",
  "Deb",
  "Dot",
  "Gus",
  "Peg",
  "Pat",
  "Pip",
  "Ned",
  "Nan",
  "Bob",
  "Bud",
  "Cam",
];

const SIGHT_3 = [
  "a",
  "the",
  "I",
  "to",
  "is",
  "and",
  "in",
  "on",
  "up",
  "it",
  "me",
  "we",
  "he",
  "she",
  "go",
  "no",
  "my",
  "see",
];

const SIGHT_4 = [
  "was",
  "they",
  "with",
  "this",
  "that",
  "said",
  "went",
  "have",
  "from",
  "him",
  "her",
  "for",
  "are",
  "you",
  "of",
  "who",
];

const SIGHT_5 = ["there", "where", "what", "when", "then", "them", "some", "come"];

const SIGHT_6 = ["before", "around", "after", "again", "could", "would"];

const SIGHT_7 = ["because", "another", "together"];

const SIGHT_8 = ["everyone", "beautiful"];

const BANK_3 = [
  "cat",
  "dog",
  "pig",
  "hen",
  "bug",
  "pup",
  "cub",
  "fox",
  "bat",
  "hat",
  "mat",
  "sat",
  "rat",
  "man",
  "ran",
  "can",
  "fan",
  "van",
  "jam",
  "web",
  "bed",
  "red",
  "pen",
  "ten",
  "wet",
  "get",
  "let",
  "net",
  "win",
  "pin",
  "fin",
  "big",
  "dig",
  "hid",
  "lid",
  "bit",
  "hit",
  "sit",
  "pot",
  "top",
  "mop",
  "hop",
  "log",
  "fog",
  "hug",
  "mug",
  "rug",
  "fun",
  "sun",
  "run",
  "bun",
  "cup",
  "bus",
  "mud",
  "sad",
  "mad",
  "bad",
  "pad",
  "dad",
  "mom",
  "kid",
  "yes",
  "not",
  "but",
  "box",
  "nap",
  "tap",
  "map",
  "cap",
  "bag",
  "tag",
  "wag",
  "leg",
  "beg",
  "peg",
  "hot",
  "dot",
  "lot",
  "cot",
  "jog",
  "sob",
  "pop",
  "cop",
  "cut",
  "nut",
  "hut",
  "tub",
  "rub",
  "hum",
  "gum",
  "sum",
  "bug",
  "dug",
  "tug",
  "an",
  "am",
  "at",
  "if",
  "ox",
  "us",
];

const BANK_4 = [
  "stop",
  "frog",
  "clap",
  "plan",
  "skip",
  "spin",
  "flag",
  "grab",
  "snip",
  "swim",
  "twin",
  "drip",
  "bump",
  "jump",
  "dump",
  "sand",
  "hand",
  "pond",
  "nest",
  "best",
  "rest",
  "hill",
  "bell",
  "mess",
  "duck",
  "sock",
  "pick",
  "lock",
  "pack",
  "back",
  "sick",
  "lick",
  "rock",
  "sing",
  "song",
  "long",
  "ring",
  "soft",
  "fast",
  "last",
  "wind",
  "gift",
  "lift",
  "help",
  "milk",
  "silk",
  "camp",
  "lamp",
  "desk",
  "cats",
  "dogs",
  "hats",
  "pigs",
  "bugs",
  "cups",
  "hops",
  "runs",
  "sits",
  "naps",
];

const BANK_5 = [
  "cake",
  "bike",
  "home",
  "cute",
  "made",
  "like",
  "ride",
  "hope",
  "cape",
  "tape",
  "gate",
  "late",
  "game",
  "name",
  "same",
  "wave",
  "save",
  "cave",
  "hive",
  "five",
  "nine",
  "hide",
  "side",
  "wide",
  "joke",
  "rope",
  "bone",
  "cone",
  "note",
  "mule",
  "smile",
  "shine",
  "white",
  "whale",
  "ship",
  "shop",
  "shed",
  "cash",
  "dish",
  "fish",
  "wish",
  "chop",
  "chin",
  "chat",
  "much",
  "such",
  "moth",
  "path",
  "bath",
  "whip",
  "when",
  "quick",
  "quit",
  "small",
  "happy",
  "funny",
  "bunny",
  "puppy",
  "sunny",
  "dusty",
  "dance",
  "place",
  "stone",
  "slide",
  "bake",
  "came",
  "safe",
  "visit",
  "river",
  "grass",
]

const BANK_6 = [
  "rain",
  "play",
  "tree",
  "boat",
  "snow",
  "wait",
  "day",
  "may",
  "feel",
  "eat",
  "sea",
  "coat",
  "road",
  "green",
  "sleep",
  "keep",
  "seed",
  "leaf",
  "read",
  "car",
  "far",
  "barn",
  "farm",
  "bird",
  "girl",
  "turn",
  "corn",
  "star",
  "dark",
  "park",
  "horn",
  "short",
  "rabbit",
  "kitten",
  "picnic",
  "sunset",
  "garden",
  "yellow",
  "purple",
  "flower",
  "friend",
  "splash",
  "bright",
  "breeze",
  "giggle",
  "jumped",
  "smiled",
  "hopped",
  "waved",
  "little",
  "forest",
];

const BANK_7 = [
  "morning",
  "whisper",
  "curious",
  "flutter",
  "puddles",
  "window",
  "rainbow",
  "sparkle",
  "sunbeam",
  "outside",
  "because",
  "sitting",
  "running",
  "looking",
  "playing",
  "sound",
  "loud",
  "cloud",
  "house",
  "mouse",
  "found",
  "round",
  "down",
  "town",
  "boy",
  "toy",
  "join",
  "point",
  "enjoy",
  "afraid",
  "journey",
];

const BANK_8 = [
  "sunshine",
  "treasure",
  "elephant",
  "laughter",
  "discover",
  "colorful",
  "friendly",
  "grateful",
  "peaceful",
  "adorable",
  "together",
  "surprise",
  "birthday",
  "backpack",
  "baseball",
  "snowflake",
  "cupcake",
  "firefly",
];

const FRAMES: Record<PhonicsStageId, string[]> = {
  3: [
    "The {noun} {verb}.",
    "A {adj} {noun}.",
    "{Name} {verb}.",
    "{Name} sat on a {noun}.",
    "The {noun} is {adj}.",
  ],
  4: [
    "The {noun} can {verb}.",
    "{Name} {verb} to the {noun}.",
    "A {noun} is in the {noun}.",
    "The {noun} and the {noun} {verb}.",
  ],
  5: [
    "The {noun} hid in the {noun}.",
    "{Name} can {verb} a {noun}.",
    "A {adj} {noun} sat on the {noun}.",
    "The {noun} and {Name} had fun.",
  ],
  6: [
    "The {noun} sat in the {place}.",
    "A {adj} {noun} {verb} on the {noun}.",
    "The {noun} ran to the {place}.",
    "She was {adj} and {adj}.",
  ],
  7: [
    "The {noun} sat by the {place}.",
    "A {adj} {noun} came from the {place}.",
    "{Name} was not {adj}.",
    "It was a {adj} {noun}.",
  ],
  8: [
    "The {noun} sat in the {place}.",
    "A {adj} {noun} came to {verb}.",
    "They found a {noun} by the {place}.",
    "It was a {adj} {noun}.",
  ],
};

const FEW_SHOTS: Record<PhonicsStageId, string[]> = {
  3: ["The cat sat.", "The cat sat on a mat.", "Sam sat.", "The cat ran to Sam."],
  4: [
    "The frog can hop.",
    "The frog hops to the pond.",
    "A duck is in the pond.",
    "The frog and the duck sit.",
  ],
  5: [
    "The pup hid in the shed.",
    "A white moth sat on the cake.",
    "Kim can bake a cake.",
    "The moth and Kim had fun.",
  ],
  6: [
    "The rabbit sat in the garden.",
    "A soft rain fell on the grass.",
    "The rabbit ran to the barn.",
    "She was safe and happy.",
  ],
  7: [
    "The morning sun hit the window.",
    "A whisper came from the garden.",
    "The curious kitten sat up.",
    "It was a fun picnic.",
  ],
  8: [
    "The elephant sat in the sunshine.",
    "A friendly bird came to visit.",
    "They found a treasure by the river.",
    "It was a peaceful morning.",
  ],
};

const SUMMARIES: Record<PhonicsStageId, string> = {
  3: "Short-vowel CVC only. One action per sentence. Repeat the same frame.",
  4: "Short vowels plus simple blends and endings. Still no silent e or vowel teams.",
  5: "Add silent e and sh/ch/th/wh. Still no rain/green/cloud vowel teams.",
  6: "Add vowel teams and r-controlled vowels. Two-syllable words are OK if they fit.",
  7: "Add diphthongs and two-syllable words. Keep sentences concrete.",
  8: "Early-reader chapter voice. Kid words only, not fancy literary words.",
};

function uniquePreserve(words: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const word of words) {
    const key = word.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(word);
  }
  return result;
}

function underLetterCap(words: string[], maxLetters: number): string[] {
  return words.filter((word) => word.replace(/[^A-Za-z]/g, "").length <= maxLetters);
}

export function getPhonicsStage(maxLetters: number): PhonicsStage {
  const stageId = (
    maxLetters < 3 ? 3 : maxLetters > 8 ? 8 : maxLetters
  ) as PhonicsStageId;

  const sightByStage: Record<PhonicsStageId, string[]> = {
    3: SIGHT_3,
    4: [...SIGHT_3, ...SIGHT_4],
    5: [...SIGHT_3, ...SIGHT_4, ...SIGHT_5],
    6: [...SIGHT_3, ...SIGHT_4, ...SIGHT_5, ...SIGHT_6],
    7: [...SIGHT_3, ...SIGHT_4, ...SIGHT_5, ...SIGHT_6, ...SIGHT_7],
    8: [...SIGHT_3, ...SIGHT_4, ...SIGHT_5, ...SIGHT_6, ...SIGHT_7, ...SIGHT_8],
  };

  const bankByStage: Record<PhonicsStageId, string[]> = {
    3: BANK_3,
    4: [...BANK_3, ...BANK_4],
    5: [...BANK_3, ...BANK_4, ...BANK_5],
    6: [...BANK_3, ...BANK_4, ...BANK_5, ...BANK_6],
    7: [...BANK_3, ...BANK_4, ...BANK_5, ...BANK_6, ...BANK_7],
    8: [...BANK_3, ...BANK_4, ...BANK_5, ...BANK_6, ...BANK_7, ...BANK_8],
  };

  const sentenceShape: Record<
    PhonicsStageId,
    { sentenceLength: string; sentenceCount: string }
  > = {
    3: {
      sentenceLength: "3-5 words per sentence",
      sentenceCount: "1-2 short sentences per page, 4 pages",
    },
    4: {
      sentenceLength: "3-5 words per sentence",
      sentenceCount: "1-2 short sentences per page, 4 pages",
    },
    5: {
      sentenceLength: "4-7 words per sentence",
      sentenceCount: "1-2 sentences per page, 4 pages",
    },
    6: {
      sentenceLength: "5-8 words per sentence",
      sentenceCount: "1-2 sentences per page, 4 pages",
    },
    7: {
      sentenceLength: "5-9 words per sentence",
      sentenceCount: "1-2 sentences per page, 4 pages",
    },
    8: {
      sentenceLength: "6-10 words per sentence",
      sentenceCount: "1-2 sentences per page, 4 pages",
    },
  };

  return {
    maxLetters: stageId,
    name: `${stageId}-letter early reader`,
    summary: SUMMARIES[stageId],
    sentenceLength: sentenceShape[stageId].sentenceLength,
    sentenceCount: sentenceShape[stageId].sentenceCount,
    frames: FRAMES[stageId],
    fewShots: FEW_SHOTS[stageId],
    sightWords: uniquePreserve(underLetterCap(sightByStage[stageId], stageId)),
    names: uniquePreserve(underLetterCap(NAMES, stageId)),
    wordBank: uniquePreserve(underLetterCap(bankByStage[stageId], stageId)),
  };
}

export function getAllowedWordSet(stage: PhonicsStage): Set<string> {
  return new Set(
    [...stage.sightWords, ...stage.names, ...stage.wordBank].map((word) =>
      word.toLowerCase()
    )
  );
}

export function exampleWordsForPrompt(stage: PhonicsStage, limit = 12): string[] {
  return stage.wordBank.slice(0, limit);
}
