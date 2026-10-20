export type GuessMode = "emoji" | "word" | "number";
export type Difficulty = "casual" | "expert";
export const MODES = {
  emoji: {
    name: "Emoji Decoder",
    eyebrow: "CONNECT THE DOTS",
    description: "Two little pictures. One big idea.",
    symbol: "✦",
  },
  word: {
    name: "Hidden Words",
    eyebrow: "FOLLOW YOUR CURIOSITY",
    description: "Read the clues. Reveal the word.",
    symbol: "Aa",
  },
  number: {
    name: "Number Hunt",
    eyebrow: "A LITTLE LOGIC",
    description: "Follow warmer clues from 1 to 100.",
    symbol: "#",
  },
} satisfies Record<
  GuessMode,
  { name: string; eyebrow: string; description: string; symbol: string }
>;
export type Puzzle = {
  id: string;
  visual: string;
  answer: string;
  clue: string;
  hint: string;
  options: string[];
};
const rows = [
  [
    "🌧️ 🏹",
    "Rainbow",
    "A little colour after the storm.",
    "Look up when sunshine meets rain.",
    "Waterfall",
    "Thunder",
    "Snowflake",
  ],
  [
    "⭐ 🐟",
    "Starfish",
    "A star that belongs in the sea.",
    "It has arms, but no hands.",
    "Seahorse",
    "Jellyfish",
    "Swordfish",
  ],
  [
    "🔥 🐕",
    "Hot dog",
    "This pair is on the menu.",
    "Usually served inside a bun.",
    "Corn dog",
    "Barbecue",
    "Chilli",
  ],
  [
    "🌙 🚶",
    "Moonwalk",
    "One giant leap for the dance floor.",
    "A famous move that slides backwards.",
    "Night hike",
    "Stargazing",
    "Sleepwalking",
  ],
  [
    "🦷 🧚",
    "Tooth fairy",
    "A tiny visitor with a special trade.",
    "Check underneath your pillow.",
    "Dentist",
    "Sleeping beauty",
    "Snow queen",
  ],
  [
    "📖 🐛",
    "Bookworm",
    "Always hungry for the next chapter.",
    "A nickname for someone who loves reading.",
    "Librarian",
    "Silkworm",
    "Storyteller",
  ],
  [
    "☀️ 🌼",
    "Sunflower",
    "A golden face in the garden.",
    "Its seeds make a delicious snack.",
    "Daisy",
    "Marigold",
    "Dandelion",
  ],
  [
    "🧊 🏔️",
    "Iceberg",
    "There is more beneath the surface.",
    "A floating giant in cold oceans.",
    "Glacier",
    "Avalanche",
    "Snowdrift",
  ],
  [
    "🕸️ 🧑",
    "Spider-Man",
    "A very unusual neighbourhood hero.",
    "With great power comes great responsibility.",
    "Batman",
    "Ant-Man",
    "Superman",
  ],
  [
    "🧠 ⛈️",
    "Brainstorm",
    "Good ideas are in the forecast.",
    "Think together to find new ideas.",
    "Daydream",
    "Mindfulness",
    "Thunderbolt",
  ],
  [
    "🍯 🌙",
    "Honeymoon",
    "A sweet escape for two.",
    "A trip after a wedding.",
    "Date night",
    "Anniversary",
    "Sweet dreams",
  ],
  [
    "🧈 🪰",
    "Butterfly",
    "A garden visitor, hidden in two words.",
    "It begins life as a caterpillar.",
    "Dragonfly",
    "Ladybird",
    "Bumblebee",
  ],
];
const words = [
  [
    "Compass",
    "I help you find your way, but I never take a step.",
    "My needle points north.",
    "Map",
    "Lantern",
    "Telescope",
  ],
  [
    "Echo",
    "I answer when you call, but I have no voice of my own.",
    "You might hear me in a canyon.",
    "Shadow",
    "Whistle",
    "Radio",
  ],
  [
    "Piano",
    "I have keys, strings, and pedals, but I cannot open a single door.",
    "My keys are black and white.",
    "Keyboard",
    "Lock",
    "Accordion",
  ],
  [
    "Footsteps",
    "The more you take, the more you leave behind.",
    "Look behind you on a sandy beach.",
    "Memories",
    "Photographs",
    "Breaths",
  ],
  [
    "Candle",
    "I grow shorter while I work, bringing light to the dark.",
    "I have a wick.",
    "Torch",
    "Matchbox",
    "Lantern",
  ],
  [
    "Horizon",
    "You can always see me, but you can never reach me.",
    "I am where the sky seems to meet the land.",
    "Mountain",
    "Cloud",
    "Rainbow",
  ],
  [
    "Sponge",
    "I am full of holes, yet I can still hold water.",
    "You might use me to wash dishes.",
    "Bucket",
    "Sieve",
    "Towel",
  ],
  [
    "Clock",
    "I have hands, but cannot clap.",
    "I tell you when it is time to go.",
    "Robot",
    "Statue",
    "Glove",
  ],
  [
    "Postage stamp",
    "I travel the world while staying in a corner.",
    "Stick me on an envelope.",
    "Passport",
    "Suitcase",
    "Photograph",
  ],
  [
    "Silence",
    "Say my name, and I disappear.",
    "You find me when everything is quiet.",
    "Secret",
    "Darkness",
    "Dream",
  ],
  [
    "Anchor",
    "I go down so that something else can stay put.",
    "A ship drops me into the sea.",
    "Ladder",
    "Submarine",
    "Fishing net",
  ],
  [
    "Library",
    "A thousand adventures live here, waiting to be opened.",
    "You borrow books from me.",
    "Museum",
    "Cinema",
    "School",
  ],
];
export const PUZZLES: Record<"emoji" | "word", Puzzle[]> = {
  emoji: rows.map(([visual, answer, clue, hint, ...wrong], i) => ({
    id: `emoji-${i}`,
    visual,
    answer,
    clue,
    hint,
    options: [answer, ...wrong],
  })),
  word: words.map(([answer, clue, hint, ...wrong], i) => ({
    id: `word-${i}`,
    visual: "?",
    answer,
    clue,
    hint,
    options: [answer, ...wrong],
  })),
};
export type Round = {
  puzzle: Puzzle;
  guesses: string[];
  hinted: boolean;
  solved: boolean;
  score: number;
};
export type Session = {
  mode: GuessMode;
  difficulty: Difficulty;
  rounds: Round[];
  index: number;
  status: "playing" | "result" | "finished";
  feedback: string;
};
export const attemptsFor = (difficulty: Difficulty) =>
  difficulty === "casual" ? 4 : 2;
export function shuffle<T>(items: readonly T[], random = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.max(0, Math.floor(random() * (i + 1))));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function createSession(
  mode: GuessMode,
  difficulty: Difficulty,
  random = Math.random,
): Session {
  const puzzles =
    mode === "number"
      ? shuffle(
          Array.from({ length: 100 }, (_, i) => i + 1),
          random,
        )
          .slice(0, 5)
          .map((n): Puzzle => ({
            id: `number-${n}`,
            answer: String(n),
            visual: "#",
            clue: "Find the secret whole number between 1 and 100.",
            hint: `It is ${n % 2 === 0 ? "even" : "odd"}.`,
            options: [],
          }))
      : shuffle(PUZZLES[mode], random)
          .slice(0, 5)
          .map((p) => ({ ...p, options: shuffle(p.options, random) }));
  return {
    mode,
    difficulty,
    rounds: puzzles.map((puzzle) => ({
      puzzle,
      guesses: [],
      hinted: false,
      solved: false,
      score: 0,
    })),
    index: 0,
    status: "playing",
    feedback: "",
  };
}
export function limitFor(session: Session) {
  return session.mode === "number"
    ? session.difficulty === "casual"
      ? 8
      : 6
    : attemptsFor(session.difficulty);
}
export function guess(session: Session, input: string): Session {
  if (session.status !== "playing") return session;
  const round = session.rounds[session.index];
  const answer = input.trim();
  if (!answer || round.guesses.includes(answer)) return session;
  if (
    session.mode === "number"
      ? !/^\d+$/.test(answer) ||
        Number(answer) < 1 ||
        Number(answer) > 100 ||
        String(Number(answer)) !== answer
      : !round.puzzle.options.includes(answer)
  )
    return session;
  const solved = answer === round.puzzle.answer;
  const guesses = [...round.guesses, answer];
  const score = solved
    ? Math.max(20, 100 - (guesses.length - 1) * 15 - (round.hinted ? 25 : 0))
    : 0;
  const next = { ...round, guesses, solved, score };
  return {
    ...session,
    rounds: session.rounds.map((r, i) => (i === session.index ? next : r)),
    status:
      solved || guesses.length >= limitFor(session) ? "result" : "playing",
    feedback: solved
      ? "You cracked it!"
      : session.mode === "number"
        ? `Go ${Number(answer) < Number(round.puzzle.answer) ? "higher ↑" : "lower ↓"}`
        : "Not quite. Try another connection.",
  };
}
export function revealHint(session: Session): Session {
  if (session.status !== "playing") return session;
  return {
    ...session,
    rounds: session.rounds.map((r, i) =>
      i === session.index ? { ...r, hinted: true } : r,
    ),
  };
}
export function nextRound(session: Session): Session {
  if (session.status !== "result") return session;
  return {
    ...session,
    index: Math.min(4, session.index + 1),
    status: session.index === 4 ? "finished" : "playing",
    feedback: "",
  };
}
export const sessionScore = (session: Session) =>
  session.rounds.reduce((sum, r) => sum + r.score, 0);
