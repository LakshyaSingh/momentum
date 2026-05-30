/**
 * Curated motivational quotes for the moment AFTER you log an application —
 * short enough to read in one breath, chosen to cheer the user on for taking
 * the shot and to keep them coming back tomorrow.
 *
 * Every quote below has been checked against a documented primary source
 * (a book, speech, letter, poem, or the author's own published work) rather
 * than a generic quote-aggregator. The `source` field records that provenance.
 * Famous-but-misattributed lines (the apocryphal "Churchill", "Twain",
 * "Einstein", "Mandela", etc.) were deliberately excluded — see git history
 * for the ones that were checked and rejected.
 *
 * The export name is kept as `JOBS_QUOTES` for backwards compatibility with the
 * motivation store and overlay components.
 */

export interface JobsQuote {
  id: number;
  text: string;
  author: string;
  /** Documented primary source (work / occasion), shown under the attribution. */
  source?: string;
}

export const JOBS_QUOTES: JobsQuote[] = [
  { id: 1, text: "You miss 100% of the shots you don't take.", author: "Wayne Gretzky", source: "The Hockey News, 1983" },
  { id: 2, text: "A journey of a thousand miles begins with a single step.", author: "Lao Tzu", source: "Tao Te Ching, ch. 64" },
  { id: 3, text: "You must do the things you think you cannot do.", author: "Eleanor Roosevelt", source: "You Learn by Living, 1960" },
  { id: 4, text: "If there is no struggle, there is no progress.", author: "Frederick Douglass", source: "West India Emancipation speech, 1857" },
  { id: 5, text: "Success is to be measured not so much by the position that one has reached in life as by the obstacles which one has overcome.", author: "Booker T. Washington", source: "Up from Slavery, 1901" },
  { id: 6, text: "The best way out is always through.", author: "Robert Frost", source: "A Servant to Servants, 1914" },
  { id: 7, text: "If one advances confidently in the direction of his dreams, and endeavors to live the life which he has imagined, he will meet with a success unexpected in common hours.", author: "Henry David Thoreau", source: "Walden, 1854" },
  { id: 8, text: "Far and away the best prize that life offers is the chance to work hard at work worth doing.", author: "Theodore Roosevelt", source: "Labor Day speech, Syracuse, 1903" },
  { id: 9, text: "If you hear a voice within you say “you cannot paint,” then by all means paint, and that voice will be silenced.", author: "Vincent van Gogh", source: "Letter to Theo, 1884" },
  { id: 10, text: "Optimism is the faith that leads to achievement; nothing can be done without hope and confidence.", author: "Helen Keller", source: "Optimism, 1903" },
  { id: 11, text: "Genius is one percent inspiration and ninety-nine percent perspiration.", author: "Thomas Edison", source: "Harper's Monthly, 1932" },
  { id: 12, text: "Doubt kills more dreams than failure ever will.", author: "Suzy Kassem", source: "Rise Up and Salute the Sun, 2011" },
  { id: 13, text: "Courage doesn't always roar. Sometimes courage is the quiet voice at the end of the day saying, “I will try again tomorrow.”", author: "Mary Anne Radmacher", source: "Courage Doesn't Always Roar, 2009" },
  { id: 14, text: "Our greatest glory is not in never falling, but in rising every time we fall.", author: "Oliver Goldsmith", source: "The Citizen of the World, 1762" },
  { id: 15, text: "The impediment to action advances action. What stands in the way becomes the way.", author: "Marcus Aurelius", source: "Meditations, 5.20" },
  { id: 16, text: "It is not because things are difficult that we do not dare; it is because we do not dare that things are difficult.", author: "Seneca", source: "Letters to Lucilius, 104" },
  { id: 17, text: "Life is either a daring adventure or nothing at all.", author: "Helen Keller", source: "Let Us Have Faith, 1940" },
  { id: 18, text: "Finish each day and be done with it. Tomorrow is a new day; begin it well and serenely.", author: "Ralph Waldo Emerson", source: "Letter to his daughter, 1854" },
  { id: 19, text: "Our doubts are traitors, and make us lose the good we oft might win, by fearing to attempt.", author: "William Shakespeare", source: "Measure for Measure, 1604" },
  { id: 20, text: "I learned that courage was not the absence of fear, but the triumph over it.", author: "Nelson Mandela", source: "Long Walk to Freedom, 1994" },
  { id: 21, text: "The credit belongs to the man who is actually in the arena … who, at the worst, if he fails, at least fails while daring greatly.", author: "Theodore Roosevelt", source: "Citizenship in a Republic, 1910" },
  { id: 22, text: "It is impossible to live without failing at something, unless you live so cautiously that you might as well not have lived at all.", author: "J.K. Rowling", source: "Harvard commencement, 2008" },
  { id: 23, text: "Always bear in mind that your own resolution to succeed is more important than any other one thing.", author: "Abraham Lincoln", source: "Letter to Isham Reavis, 1855" },
  { id: 24, text: "Never give in. Never give in. Never, never, never, never—in nothing, great or small, large or petty.", author: "Winston Churchill", source: "Harrow School address, 1941" },
  { id: 25, text: "You may encounter many defeats, but you must not be defeated.", author: "Maya Angelou", source: "Black Women Writers at Work, 1983" },
  { id: 26, text: "The price of success is hard work, dedication to the job at hand, and the determination that whether we win or lose, we have applied the best of ourselves to the task at hand.", author: "Vince Lombardi", source: "What It Takes to Be #1" },
  { id: 27, text: "Courage is resistance to fear, mastery of fear—not absence of fear.", author: "Mark Twain", source: "Pudd'nhead Wilson, 1894" },
  { id: 28, text: "I'm not afraid of storms, for I'm learning how to sail my ship.", author: "Louisa May Alcott", source: "Little Women, 1868" },
  { id: 29, text: "Life shrinks or expands in proportion to one's courage.", author: "Anaïs Nin", source: "The Diary of Anaïs Nin, Vol. 3 (1941)" },
  { id: 30, text: "I never could have done what I have done without the habits of punctuality, order, and diligence, without the determination to concentrate myself on one object at a time.", author: "Charles Dickens", source: "David Copperfield, 1850" },
  { id: 31, text: "Self-trust is the first secret of success.", author: "Ralph Waldo Emerson", source: "Success, in Society and Solitude, 1870" },
  { id: 32, text: "Believe that life is worth living, and your belief will help create the fact.", author: "William James", source: "Is Life Worth Living?, 1895" },
  { id: 33, text: "Henceforth I ask not good-fortune, I myself am good-fortune.", author: "Walt Whitman", source: "Song of the Open Road, Leaves of Grass" },
];

export function pickQuote(seed: number, recent: number[]): JobsQuote {
  // Try a few seeds away if the seeded pick is in the recent buffer.
  for (let attempt = 0; attempt < 8; attempt++) {
    const idx = (seed + attempt * 13) % JOBS_QUOTES.length;
    if (!recent.includes(idx)) return JOBS_QUOTES[idx]!;
  }
  return JOBS_QUOTES[seed % JOBS_QUOTES.length]!;
}
