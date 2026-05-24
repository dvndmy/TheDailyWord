import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  signInWithCredential,
  linkWithPopup,
  signOut as firebaseSignOut,
  fetchSignInMethodsForEmail,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  runTransaction,
  increment,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { books } from "./data/books.js";
import { verses } from "./data/verses.js";

const CONFIG = {
  modes: {
    normal: {
      maxGuesses: 6,
      progressiveHints: true,
      hintSchedule: {
        testamentAt: 1,
        sectionAt: 3,
        firstLetterAt: 4,
        referenceAt: 6,
      },
    },
    easy: {
      maxGuesses: 8,
      progressiveHints: true,
      hintSchedule: {
        testamentAt: 1,
        sectionAt: 3,
        firstLetterAt: 4,
        referenceAt: 7,
      },
    },
    hard: {
      maxGuesses: 5,
      progressiveHints: false,
      hintSchedule: {
        testamentAt: 1,
        sectionAt: 4,
        firstLetterAt: 5,
        referenceAt: null,
      },
    },
  },
  proximityBands: {
    exact: 0,
    veryClose: 2,
    near: 4,
  },
  ui: {
    maxSuggestions: 8,
  },
  daily: {
    epochYear: 2026,
    epochMonth: 0,
    epochDay: 1,
  },
  storageKeys: {
    progress: "bibdle-progress",
    preferences: "bibdle-preferences",
    stats: "bibdle-stats",
  },
};

const FIREBASE_CONFIG = {
  // SECURITY NOTE:
  // Firestore Security Rules must restrict reads/writes so a signed-in user
  // can only access their own document, e.g. users/{uid}/profile/main where
  // request.auth.uid == uid.

  // TODO: Replace these placeholder values with your real Firebase Web App config.
  apiKey: "AIzaSyC8Mo3GyKwFLvJU5npB_ZwlApJkDqnRrMY",
  authDomain: "bibdle-db7ae.firebaseapp.com",
  projectId: "bibdle-db7ae",
  storageBucket: "bibdle-db7ae.firebasestorage.app",
  messagingSenderId: "278845724002",
  appId: "1:278845724002:web:0842b72515b58791d0883b",
};

const FIREBASE_ENABLED =
  FIREBASE_CONFIG.apiKey !== "REPLACE_ME" &&
  FIREBASE_CONFIG.projectId !== "REPLACE_ME";

let firebaseApp = null;
let firebaseAuth = null;
let firebaseDb = null;
let firebaseGoogleProvider = null;

const STREAK_BADGES = [
  { id: "streak-3", threshold: 3, label: "3-Day Streak" },
  { id: "streak-7", threshold: 7, label: "7-Day Streak" },
  { id: "streak-14", threshold: 14, label: "14-Day Streak" },
  { id: "streak-30", threshold: 30, label: "30-Day Streak" },
];

const state = {
  mode: "daily",
  currentPuzzle: null,
  guesses: [],
  status: "playing",
  selectedSuggestionIndex: -1,
  currentSuggestions: [],
  postGameOpen: false,
  countdownIntervalId: null,
  countdownTimeoutId: null,
  preferences: {
    theme: "dark",
    difficulty: "normal",
    preferredMode: "daily",
    sound: false,
    reducedAnimation: false,
    highContrast: false,
    largeText: false,
  },
  stats: {
    daily: {
      played: 0,
      won: 0,
      lost: 0,
      currentStreak: 0,
      bestStreak: 0,
      guessDistribution: {},
      lastDailySolvedDate: null,
      earnedBadges: [],
    },
    practice: {
      played: 0,
      won: 0,
      lost: 0,
      guessDistribution: {},
    },
    bookStats: {},
  },
  auth: {
    ready: false,
    enabled: false,
    user: null,
    syncing: false,
  },
  leaderboard: {
    loading: false,
    stats: null,
    entries: [],
    userRank: null,
  },
};

const elements = {
  signInBtn: document.getElementById("signInBtn"),
  signOutBtn: document.getElementById("signOutBtn"),
  authStatus: document.getElementById("authStatus"),

  verseText: document.getElementById("verseText"),
  dateLabel: document.getElementById("dateLabel"),
  countdownTimer: document.getElementById("countdownTimer"),
  attemptLabel: document.getElementById("attemptLabel"),
  hintBlock: document.getElementById("hintBlock"),
  guessForm: document.getElementById("guessForm"),
  guessInput: document.getElementById("guessInput"),
  autocomplete: document.getElementById("autocomplete"),
  guessRows: document.getElementById("guessRows"),
  proximityLine: document.getElementById("proximityLine"),
  statusLine: document.getElementById("statusLine"),

  helpBtn: document.getElementById("helpBtn"),
  shareBtn: document.getElementById("shareBtn"),
  nextPracticeBtn: document.getElementById("nextPracticeBtn"),
  settingsBtn: document.getElementById("settingsBtn"),
  statsBtn: document.getElementById("statsBtn"),

  difficultySelect: document.getElementById("difficultySelect"),
  modeSelect: document.getElementById("modeSelect"),
  themeToggle: document.querySelector("[data-theme-toggle]"),

  helpModal: document.getElementById("helpModal"),
  closeHelpBtn: document.getElementById("closeHelpBtn"),

  settingsModal: document.getElementById("settingsModal"),
  closeSettingsBtn: document.getElementById("closeSettingsBtn"),
  reducedMotionToggle: document.getElementById("reducedMotionToggle"),
  highContrastToggle: document.getElementById("highContrastToggle"),
  largeTextToggle: document.getElementById("largeTextToggle"),
  soundToggle: document.getElementById("soundToggle"),

  statsModal: document.getElementById("statsModal"),
  closeStatsBtn: document.getElementById("closeStatsBtn"),
  statsPlayed: document.getElementById("statsPlayed"),
  statsWon: document.getElementById("statsWon"),
  statsLost: document.getElementById("statsLost"),
  statsCurrentStreak: document.getElementById("statsCurrentStreak"),
  statsBestStreak: document.getElementById("statsBestStreak"),
  statsGuessDistribution: document.getElementById("statsGuessDistribution"),
  statsModalBadges: document.getElementById("statsModalBadges"),
  practiceStatsPlayed: document.getElementById("practiceStatsPlayed"),
  practiceStatsWon: document.getElementById("practiceStatsWon"),
  practiceStatsLost: document.getElementById("practiceStatsLost"),
  practiceStatsGuessDistribution: document.getElementById("practiceStatsGuessDistribution"),
  postGameStatsLabel: document.getElementById("postGameStatsLabel"),
  postGameStatsGridSecondary: document.getElementById("postGameStatsGridSecondary"),
  postGameStatsPlayed: document.getElementById("postGameStatsPlayed"),
  postGameStatsWon: document.getElementById("postGameStatsWon"),
  postGameStatsLost: document.getElementById("postGameStatsLost"),
  postGameStatsCurrentStreak: document.getElementById("postGameStatsCurrentStreak"),
  postGameStatsBestStreak: document.getElementById("postGameStatsBestStreak"),
  postGameCurrentStreakItem: document.getElementById("postGameCurrentStreakItem"),
  postGameBestStreakItem: document.getElementById("postGameBestStreakItem"),
  postGameGuessDistribution: document.getElementById("postGameGuessDistribution"),
  postGameModal: document.getElementById("postGameModal"),
  postGameTitle: document.getElementById("postGameTitle"),
  postGameBadge: document.getElementById("postGameBadge"),
  postGameReference: document.getElementById("postGameReference"),
  postGameBook: document.getElementById("postGameBook"),
  postGameVerse: document.getElementById("postGameVerse"),
  postGameIntroTitle: document.getElementById("postGameIntroTitle"),
  postGameIntroText: document.getElementById("postGameIntroText"),
  postGameCloseBtn: document.getElementById("postGameCloseBtn"),
  postGameNextBtn: document.getElementById("postGameNextBtn"),
  postGameTriviaSection: document.getElementById("postGameTriviaSection"),
  postGameTriviaTitle: document.getElementById("postGameTriviaTitle"),
  postGameTriviaText: document.getElementById("postGameTriviaText"),
  postGameTriviaChips: document.getElementById("postGameTriviaChips"),

  archiveBtn: document.getElementById("archiveBtn"),
  archiveModal: document.getElementById("archiveModal"),
  closeArchiveBtn: document.getElementById("closeArchiveBtn"),
  archiveSummary: document.getElementById("archiveSummary"),
  archiveGrid: document.getElementById("archiveGrid"),
  archiveDetails: document.getElementById("archiveDetails"),

  leaderboardBtn: document.getElementById("leaderboardBtn"),
  leaderboardModal: document.getElementById("leaderboardModal"),
  closeLeaderboardBtn: document.getElementById("closeLeaderboardBtn"),
  leaderboardSummary: document.getElementById("leaderboardSummary"),
  leaderboardList: document.getElementById("leaderboardList"),
  leaderboardUserRank: document.getElementById("leaderboardUserRank"),
};

function getSystemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

const LEADERBOARD_LIMIT = 10;

function getDailyDateKey() {
  if (state.currentPuzzle?.mode === "daily" && state.currentPuzzle?.date) {
    return state.currentPuzzle.date;
  }

  return getTodayPuzzleDate();
}

function getDailyPuzzleId() {
  return (
    state.currentPuzzle?.verse?.id ||
    state.currentPuzzle?.id ||
    state.currentPuzzle?.verse?.reference ||
    state.currentPuzzle?.verse?.book ||
    getDailyDateKey()
  );
}

function getDailyStatsDocRef(dateKey) {
  if (!firebaseDb || !dateKey) return null;
  return doc(firebaseDb, "dailyStats", dateKey);
}

function getDailyScoresCollectionRef(dateKey) {
  if (!firebaseDb || !dateKey) return null;
  return collection(firebaseDb, "dailyStats", dateKey, "scores");
}

function sanitizeLeaderboardName(name) {
  const raw = typeof name === "string" ? name.trim() : "";
  if (!raw) return "Anonymous Disciple";
  const cleaned = raw.replace(/\s+/g, " ").replace(/[<>]/g, "");
  return cleaned.length > 24 ? `${cleaned.slice(0, 24)}…` : cleaned;
}

function getAnonymousPublicNameFromUid(uid) {
  const safeUid = String(uid || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  const suffix = (safeUid || "unknown00").slice(0, 8).padEnd(8, "0");
  return `disciple_${suffix}`;
}

function getPublicUserName(user = state.auth.user) {
  if (!user) return "";

  if (user.isAnonymous) {
    return getAnonymousPublicNameFromUid(user.uid);
  }

  return sanitizeLeaderboardName(user.displayName || user.email || "Google user");
}

function formatLeaderboardTime(value) {
  if (!value) return "—";
  try {
    const date =
      typeof value?.toDate === "function" ? value.toDate() : new Date(value);
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function getLeaderboardEntryDocRef(dateKey, uid) {
  if (!firebaseDb || !dateKey || !uid) return null;
  return doc(firebaseDb, "dailyStats", dateKey, "scores", uid);
}

function getUserProfileRef(uid) {
  if (!firebaseDb || !uid) return null;
  return doc(firebaseDb, "users", uid, "profile", "main");
}

function getLocalPreferencesSnapshot() {
  return JSON.parse(JSON.stringify(state.preferences));
}

function getLocalStatsSnapshot() {
  return JSON.parse(JSON.stringify(state.stats));
}

function sanitizeCloudProfile(data) {
  if (!data || typeof data !== "object") {
    return { preferences: null, stats: null };
  }

  return {
    preferences:
      data.preferences && typeof data.preferences === "object"
        ? data.preferences
        : null,
    stats: data.stats && typeof data.stats === "object" ? data.stats : null,
  };
}

function mergePreferenceData(localPreferences, cloudPreferences) {
  if (!cloudPreferences || typeof cloudPreferences !== "object") {
    return { ...localPreferences };
  }

  return {
    ...localPreferences,
    ...cloudPreferences,
  };
}

function mergeGuessDistribution(localValue, cloudValue) {
  const output = {};
  const keys = new Set([
    ...Object.keys(localValue || {}),
    ...Object.keys(cloudValue || {}),
  ]);

  keys.forEach((key) => {
    const localCount = Number.isInteger(localValue?.[key]) ? localValue[key] : 0;
    const cloudCount = Number.isInteger(cloudValue?.[key]) ? cloudValue[key] : 0;
    output[key] = Math.max(localCount, cloudCount);
  });

  return output;
}

function mergeBookStatsMap(localMap, cloudMap) {
  const output = {};
  const keys = new Set([
    ...Object.keys(localMap || {}),
    ...Object.keys(cloudMap || {}),
  ]);

  keys.forEach((key) => {
    const localEntry = localMap?.[key] || null;
    const cloudEntry = cloudMap?.[key] || null;

    const localBest =
      Number.isInteger(localEntry?.bestAttempts) && localEntry.bestAttempts > 0
        ? localEntry.bestAttempts
        : null;

    const cloudBest =
      Number.isInteger(cloudEntry?.bestAttempts) && cloudEntry.bestAttempts > 0
        ? cloudEntry.bestAttempts
        : null;

    output[key] = {
      plays: Math.max(localEntry?.plays || 0, cloudEntry?.plays || 0),
      solves: Math.max(localEntry?.solves || 0, cloudEntry?.solves || 0),
      bestAttempts:
        localBest === null
          ? cloudBest
          : cloudBest === null
            ? localBest
            : Math.min(localBest, cloudBest),
      totalAttempts: Math.max(
        localEntry?.totalAttempts || 0,
        cloudEntry?.totalAttempts || 0,
      ),
      lastSolvedDate:
        [localEntry?.lastSolvedDate, cloudEntry?.lastSolvedDate]
          .filter(Boolean)
          .sort()
          .at(-1) || null,
    };
  });

  return output;
}

function mergeStatsData(localStats, cloudStats) {
  if (!cloudStats || typeof cloudStats !== "object") {
    return JSON.parse(JSON.stringify(localStats));
  }

  const localDaily = localStats?.daily || {};
  const cloudDaily = cloudStats?.daily || {};
  const localPractice = localStats?.practice || {};
  const cloudPractice = cloudStats?.practice || {};

  return {
    daily: {
      played: Math.max(localDaily.played || 0, cloudDaily.played || 0),
      won: Math.max(localDaily.won || 0, cloudDaily.won || 0),
      lost: Math.max(localDaily.lost || 0, cloudDaily.lost || 0),
      currentStreak: Math.max(
        localDaily.currentStreak || 0,
        cloudDaily.currentStreak || 0,
      ),
      bestStreak: Math.max(localDaily.bestStreak || 0, cloudDaily.bestStreak || 0),
      guessDistribution: mergeGuessDistribution(
        localDaily.guessDistribution,
        cloudDaily.guessDistribution,
      ),
      lastDailySolvedDate:
        [localDaily.lastDailySolvedDate, cloudDaily.lastDailySolvedDate]
          .filter(Boolean)
          .sort()
          .at(-1) || null,
      earnedBadges: Array.from(
        new Set([
          ...(Array.isArray(localDaily.earnedBadges) ? localDaily.earnedBadges : []),
          ...(Array.isArray(cloudDaily.earnedBadges) ? cloudDaily.earnedBadges : []),
        ]),
      ),
    },
    practice: {
      played: Math.max(localPractice.played || 0, cloudPractice.played || 0),
      won: Math.max(localPractice.won || 0, cloudPractice.won || 0),
      lost: Math.max(localPractice.lost || 0, cloudPractice.lost || 0),
      guessDistribution: mergeGuessDistribution(
        localPractice.guessDistribution,
        cloudPractice.guessDistribution,
      ),
    },
    bookStats: mergeBookStatsMap(localStats?.bookStats, cloudStats?.bookStats),
  };
}

function mergeLocalAndCloudData(localData, cloudData) {
  return {
    preferences: mergePreferenceData(localData.preferences, cloudData.preferences),
    stats: mergeStatsData(localData.stats, cloudData.stats),
  };
}

function normalizeBookName(value) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getBookByName(name) {
  const normalized = normalizeBookName(name);
  return books.find((book) => book.normalizedName === normalized);
}

function getBookStatsKey(book) {
  if (!book) return "";
  return book.id || book.bookId || book.slug || normalizeBookName(book.name);
}

function ensureBookStatsEntry(book) {
  const key = getBookStatsKey(book);
  if (!key) return null;

  if (!state.stats.bookStats[key]) {
    state.stats.bookStats[key] = {
      plays: 0,
      solves: 0,
      bestAttempts: null,
      totalAttempts: 0,
      lastSolvedDate: null,
    };
  }

  return state.stats.bookStats[key];
}

function getBookStats(book) {
  const key = getBookStatsKey(book);
  return state.stats.bookStats[key] ?? null;
}

function getAverageAttemptsForBook(book) {
  const entry = getBookStats(book);
  if (!entry || entry.solves <= 0) return null;
  return entry.totalAttempts / entry.solves;
}

function getArchiveCellState(book) {
  const entry = getBookStats(book);

  if (!entry || entry.plays <= 0) return "is-unplayed";
  if (entry.solves <= 0) return "is-played-unsolved";
  if (entry.bestAttempts !== null && entry.bestAttempts <= 2) return "is-solved-low";
  if (entry.bestAttempts !== null && entry.bestAttempts <= 4) return "is-solved-mid";
  return "is-solved-high";
}

function getArchiveCellStateLabel(book) {
  const entry = getBookStats(book);

  if (!entry || entry.plays <= 0) return "Unplayed";
  if (entry.solves <= 0) return "Played, unsolved";
  if (entry.bestAttempts !== null && entry.bestAttempts <= 2) return "Very efficient";
  if (entry.bestAttempts !== null && entry.bestAttempts <= 4) return "Efficient";
  return "Solved slowly";
}

function getArchiveCellAriaLabel(book) {
  const entry = getBookStats(book);
  const stateLabel = getArchiveCellStateLabel(book);

  if (!entry || entry.plays <= 0) {
    return `${book.name}, ${book.testament} Testament, ${book.section}, not yet solved`;
  }

  if (entry.solves <= 0) {
    return `${book.name}, ${book.testament} Testament, ${book.section}, played but not yet solved`;
  }

  const bestText =
    entry.bestAttempts === null ? "no best solve recorded" : `best ${entry.bestAttempts} guesses`;

  return `${book.name}, ${book.testament} Testament, ${book.section}, ${stateLabel.toLowerCase()}, solved ${entry.solves} times, ${bestText}`;
}

function getPuzzleById(id) {
  return verses.find((verse) => verse.id === id) ?? null;
}

function getBookDistance(a, b) {
  const bookA = typeof a === "string" ? getBookByName(a) : a;
  const bookB = typeof b === "string" ? getBookByName(b) : b;

  if (!bookA || !bookB) return null;
  return Math.abs(bookA.order - bookB.order);
}

function isSameSection(a, b) {
  const bookA = typeof a === "string" ? getBookByName(a) : a;
  const bookB = typeof b === "string" ? getBookByName(b) : b;

  if (!bookA || !bookB) return false;
  return bookA.sectionKey === bookB.sectionKey;
}

function getProximityLabel(distance, sameTestament = true) {
  if (!sameTestament) return "wrong testament";
  if (distance === null) return "far";
  if (distance <= CONFIG.proximityBands.exact) return "exact";
  if (distance <= CONFIG.proximityBands.veryClose) return "very close";
  if (distance <= CONFIG.proximityBands.near) return "near";
  return "far";
}

function getProximityDescription(guess) {
  if (!guess) return "";

  const descriptions = {
    exact: `${guess.book} is exactly the right book in canon order.`,
    "very close": `${guess.book} is very close to the target in canon order.`,
    near: `${guess.book} is near the target in canon order.`,
    far: `${guess.book} is still far from the target in canon order.`,
    "wrong testament":
      `${guess.book} is in the wrong testament, so the target is on the other side of the Bible.`,
  };

  return descriptions[guess.proximity] ?? "";
}

function getTodayPuzzleDate() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getPreviousDate(dateString) {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function getDailyIndex() {
  const now = new Date();
  const epoch = Date.UTC(
    CONFIG.daily.epochYear,
    CONFIG.daily.epochMonth,
    CONFIG.daily.epochDay,
  );
  const current = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );

  return (
    ((Math.floor((current - epoch) / 86400000) % verses.length) + verses.length)
    % verses.length
  );
}

function getNextUTCMidnight() {
  const now = new Date();
  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0,
      0,
      0,
      0,
    ),
  );
}

function formatTime(leftMs) {
  const safeMs = Math.max(0, Math.floor(leftMs));
  const totalSeconds = Math.floor(safeMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${Math.max(seconds, 0)}s`;
}

function stopCountdownTimer() {
  if (state.countdownIntervalId) {
    clearInterval(state.countdownIntervalId);
    state.countdownIntervalId = null;
  }

  if (state.countdownTimeoutId) {
    clearTimeout(state.countdownTimeoutId);
    state.countdownTimeoutId = null;
  }
}

function scheduleDailyReset() {
  if (state.countdownTimeoutId) return;

  state.countdownTimeoutId = window.setTimeout(() => {
    state.countdownTimeoutId = null;
    resetPuzzle("daily");
  }, 1500);
}

function updateCountdownLabel() {
  const label = elements.countdownTimer?.parentElement;
  const target = elements.countdownTimer;
  if (!label || !target) return;

  if (state.mode !== "daily") {
    label.classList.add("hidden");
    label.classList.add("is-muted");
    target.textContent = "";
    return;
  }

  label.classList.remove("hidden");
  label.classList.remove("is-muted");

  const diff = getNextUTCMidnight().getTime() - Date.now();
  if (diff <= 1000) {
    target.textContent = "Next puzzle is ready";
    scheduleDailyReset();
    stopCountdownTimer();
    return;
  }

  target.textContent = `Next puzzle in ${formatTime(diff)}`;
}

function startCountdownTimer() {
  if (!elements.countdownTimer) return;

  stopCountdownTimer();
  updateCountdownLabel();

  if (state.mode !== "daily") return;

  state.countdownIntervalId = window.setInterval(() => {
    if (document.hidden) return;
    updateCountdownLabel();
  }, 1000);
}

function pickPuzzle(mode = "daily") {
  if (mode === "practice") {
    return verses[Math.floor(Math.random() * verses.length)];
  }

  return verses[getDailyIndex()];
}

function buildCurrentPuzzle(mode = "daily") {
  const puzzle = pickPuzzle(mode);

  return {
    id: puzzle.id,
    date: mode === "daily" ? getTodayPuzzleDate() : null,
    mode,
    verse: puzzle,
  };
}

async function syncCurrentStateToCloudIfSignedIn() {
  if (!state.auth.enabled || !state.auth.user?.uid || !firebaseDb) return;

  try {
    await writeMergedDataToCloud(state.auth.user.uid, {
      preferences: getLocalPreferencesSnapshot(),
      stats: getLocalStatsSnapshot(),
    });
  } catch (error) {
    console.error("Background cloud sync failed:", error);
  }
}

async function fetchDailyGlobalStats(dateKey) {
  console.log("Fetching daily stats for", dateKey);
  const statsRef = getDailyStatsDocRef(dateKey);
  if (!statsRef) return null;

  const snapshot = await getDoc(statsRef);
  console.log("Daily stats exists:", snapshot.exists());
  return snapshot.exists() ? snapshot.data() : null;
}

async function fetchLeaderboardTopEntries(dateKey) {
  console.log("Fetching leaderboard top entries for", dateKey);
  const scoresRef = getDailyScoresCollectionRef(dateKey);
  if (!scoresRef) return [];

  const q = query(
    scoresRef,
    where("result", "==", "won"),
    orderBy("guesses", "asc"),
    orderBy("completedAt", "asc"),
    limit(10),
  );

  const snapshot = await getDocs(q);
  console.log("Top entries count:", snapshot.size);

  return snapshot.docs.map((docSnap, index) => ({
    id: docSnap.id,
    rank: index + 1,
    ...docSnap.data(),
  }));
}

async function fetchCurrentUserRank(dateKey, uid) {
  console.log("Fetching user rank for", dateKey, uid);
  if (!uid) return null;

  const entryRef = getLeaderboardEntryDocRef(dateKey, uid);
  if (!entryRef) return null;

  const entrySnap = await getDoc(entryRef);
  if (!entrySnap.exists()) return null;

  const entry = entrySnap.data();

  if (entry.result !== "won") {
    return {
      rank: null,
      ...entry,
    };
  }

  const scoresRef = getDailyScoresCollectionRef(dateKey);
  if (!scoresRef) return { rank: null, ...entry };

  const betterQuery = query(
    scoresRef,
    where("result", "==", "won"),
    where("guesses", "<", entry.guesses),
  );

  const sameGuessEarlierQuery = query(
    scoresRef,
    where("result", "==", "won"),
    where("guesses", "==", entry.guesses),
    where("completedAt", "<", entry.completedAt),
  );

  let betterCount = 0;
  let earlierCount = 0;

  try {
    const [betterSnap, earlierSnap] = await Promise.all([
      getDocs(betterQuery),
      getDocs(sameGuessEarlierQuery),
    ]);
    betterCount = betterSnap.size;
    earlierCount = earlierSnap.size;
  } catch {
    return { rank: null, ...entry };
  }

  return {
    rank: betterCount + earlierCount + 1,
    ...entry,
  };
}

function renderLeaderboardSummary(stats) {
  if (!elements.leaderboardSummary) return;

  const players = stats?.players || 0;
  const solvers = stats?.solvers || 0;
  const averageWinningGuesses =
    typeof stats?.averageWinningGuesses === "number"
      ? stats.averageWinningGuesses
      : 0;
  const solveRate = players > 0 ? Math.round((solvers / players) * 100) : 0;

  elements.leaderboardSummary.innerHTML = `
    <div class="leaderboard-kpis">
      <div class="leaderboard-kpi">
        <span class="leaderboard-kpi-value">${players}</span>
        <span class="leaderboard-kpi-label">Players today</span>
      </div>
      <div class="leaderboard-kpi">
        <span class="leaderboard-kpi-value">${solvers}</span>
        <span class="leaderboard-kpi-label">Solved today</span>
      </div>
      <div class="leaderboard-kpi">
        <span class="leaderboard-kpi-value">${solveRate}%</span>
        <span class="leaderboard-kpi-label">Solve rate</span>
      </div>
      <div class="leaderboard-kpi">
        <span class="leaderboard-kpi-value">${solvers > 0 ? averageWinningGuesses.toFixed(2) : "—"
    }</span>
        <span class="leaderboard-kpi-label">Avg. winning guesses</span>
      </div>
    </div>
    <p class="leaderboard-meta-note">
      Global daily metrics for the current puzzle.
    </p>
  `;
}

async function ensureAnonymousAuthForDailySubmission() {
  if (!state.auth.enabled || !firebaseAuth) return null;

  if (state.auth.user?.uid) {
    return state.auth.user;
  }

  try {
    await signInAnonymously(firebaseAuth);
    return firebaseAuth.currentUser || null;
  } catch (error) {
    console.error("Anonymous auth failed:", error);
    return null;
  }
}

async function submitDailyResultToLeaderboard(outcome) {
  if (!state.auth.enabled || !firebaseDb || state.mode !== "daily") {
    return;
  }

  const user = await ensureAnonymousAuthForDailySubmission();
  if (!user?.uid) {
    renderStatus("Global submission is unavailable right now, but your local result was saved.");
    return;
  }

  const dateKey = getDailyDateKey();
  const uid = user.uid;
  const statsRef = getDailyStatsDocRef(dateKey);
  const entryRef = getLeaderboardEntryDocRef(dateKey, uid);

  if (!statsRef || !entryRef) return;

  const displayName = getPublicUserName(user);
  const puzzleId = getDailyPuzzleId();
  const isWin = outcome?.result === "won";
  const guesses = Number.isInteger(outcome?.guesses) ? outcome.guesses : null;

  try {
    await runTransaction(firebaseDb, async (transaction) => {
      const existingEntrySnap = await transaction.get(entryRef);

      if (existingEntrySnap.exists()) {
        return;
      }

      const statsSnap = await transaction.get(statsRef);

      const nextStats = statsSnap.exists()
        ? statsSnap.data()
        : {
          date: dateKey,
          puzzleId,
          players: 0,
          solvers: 0,
          totalWinningGuesses: 0,
          averageWinningGuesses: 0,
        };

      transaction.set(entryRef, {
        uid,
        displayName,
        result: isWin ? "won" : "lost",
        guesses: isWin ? guesses : null,
        completedAt: serverTimestamp(),
        puzzleId,
      });

      const players = (nextStats.players || 0) + 1;
      const solvers = (nextStats.solvers || 0) + (isWin ? 1 : 0);
      const totalWinningGuesses =
        (nextStats.totalWinningGuesses || 0) + (isWin && guesses ? guesses : 0);

      transaction.set(
        statsRef,
        {
          date: dateKey,
          puzzleId,
          players,
          solvers,
          totalWinningGuesses,
          averageWinningGuesses:
            solvers > 0 ? totalWinningGuesses / solvers : 0,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    });
  } catch (error) {
    console.error("Leaderboard submission failed:", error);
  }
}

function renderLeaderboardList(entries) {
  if (!elements.leaderboardList) return;

  if (!entries || entries.length === 0) {
    elements.leaderboardList.innerHTML = `
      <div class="leaderboard-empty">
        No winning scores have been submitted yet for today.
      </div>
    `;
    return;
  }

  const currentUid = state.auth.user?.uid || null;

  elements.leaderboardList.innerHTML = `
    <div class="leaderboard-list-shell">
      ${entries
      .map((entry, index) => {
        const isCurrentUser = currentUid && entry.uid === currentUid;
        const name =
          entry.uid && String(entry.displayName || "").startsWith("disciple_")
            ? entry.displayName
            : entry.displayName
              ? sanitizeLeaderboardName(entry.displayName)
              : getAnonymousPublicNameFromUid(entry.uid);
        return `
            <div class="leaderboard-row${isCurrentUser ? " is-current-user" : ""}">
              <div class="leaderboard-rank">#${index + 1}</div>
              <div class="leaderboard-name">${name}</div>
              <div class="leaderboard-guesses">${entry.guesses} guesses</div>
              <div class="leaderboard-time">${formatLeaderboardTime(entry.completedAt)}</div>
            </div>
          `;
      })
      .join("")}
    </div>
  `;
}

function renderCurrentUserRank(rankEntry) {
  if (!elements.leaderboardUserRank) return;

  if (!state.auth.user) {
    elements.leaderboardUserRank.innerHTML = `
      <div class="leaderboard-empty">
        Complete today’s Daily puzzle to join the global leaderboard automatically.
      </div>
    `;
    return;
  }

  if (!rankEntry) {
    elements.leaderboardUserRank.innerHTML = `
      <div class="leaderboard-empty">
        You have not submitted a Daily result for this puzzle yet.
      </div>
    `;
    return;
  }

  const rankLabel =
    rankEntry.result === "won" && rankEntry.rank
      ? `#${rankEntry.rank}`
      : "Recorded";

  elements.leaderboardUserRank.innerHTML = `
    <div class="leaderboard-user-rank-card">
      <div>
        <div class="label">Your place</div>
        <div class="value">${rankLabel}</div>
      </div>
      <div>
        <div class="label">Result</div>
        <div class="value">${rankEntry.result === "won" ? "Solved" : "Played"}</div>
      </div>
      <div>
        <div class="label">Guesses</div>
        <div class="value">${rankEntry.guesses ?? "—"}</div>
      </div>
      <div>
        <div class="label">Time</div>
        <div class="value">${formatLeaderboardTime(rankEntry.completedAt)}</div>
      </div>
    </div>
  `;
}

function clearSavedProgress() {
  try {
    localStorage.removeItem(CONFIG.storageKeys.progress);
  } catch { }
}

function buildProgressPayload() {
  if (!state.currentPuzzle) return null;

  return {
    mode: state.mode,
    currentPuzzle: {
      id: state.currentPuzzle.id,
      date: state.currentPuzzle.date,
      mode: state.currentPuzzle.mode,
    },
    guesses: state.guesses,
    status: state.status,
    inputDraft: elements.guessInput?.value ?? "",
  };
}

function canRestoreSavedPracticePuzzle(saved) {
  if (!saved || saved.currentPuzzle?.mode !== "practice") return false;
  if (!saved.currentPuzzle?.id) return false;
  return !!getPuzzleById(saved.currentPuzzle.id);
}

function restoreDraftInput(saved) {
  if (!elements.guessInput) return;
  elements.guessInput.value =
    typeof saved?.inputDraft === "string" ? saved.inputDraft : "";
}

function saveProgress() {
  const payload = buildProgressPayload();
  if (!payload) return;

  try {
    localStorage.setItem(CONFIG.storageKeys.progress, JSON.stringify(payload));
  } catch { }
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(CONFIG.storageKeys.progress);
    if (!raw) return false;

    const saved = JSON.parse(raw);
    if (!saved || !saved.currentPuzzle?.id) {
      clearSavedProgress();
      return false;
    }

    const savedPuzzle = getPuzzleById(saved.currentPuzzle.id);
    if (!savedPuzzle) {
      clearSavedProgress();
      return false;
    }

    const savedStatus = ["playing", "won", "lost"].includes(saved.status)
      ? saved.status
      : "playing";

    if (saved.currentPuzzle.mode === "daily") {
      const todayPuzzle = pickPuzzle("daily");
      const todayDate = getTodayPuzzleDate();
      const isMatchingDailyPuzzle =
        saved.currentPuzzle.date === todayDate &&
        saved.currentPuzzle.id === todayPuzzle.id;

      if (!isMatchingDailyPuzzle) {
        clearSavedProgress();
        return false;
      }

      state.mode = "daily";
      state.currentPuzzle = {
        id: savedPuzzle.id,
        date: saved.currentPuzzle.date,
        mode: "daily",
        verse: savedPuzzle,
      };
    } else if (canRestoreSavedPracticePuzzle(saved)) {
      state.mode = "practice";
      state.currentPuzzle = {
        id: savedPuzzle.id,
        date: null,
        mode: "practice",
        verse: savedPuzzle,
      };
    } else {
      clearSavedProgress();
      return false;
    }

    state.guesses = Array.isArray(saved.guesses) ? saved.guesses : [];
    state.status = savedStatus;
    restoreDraftInput(saved);
    resetSuggestionsState();
    closeSuggestions();

    return true;
  } catch {
    clearSavedProgress();
    return false;
  }
}

function savePreferences() {
  const payload = {
    theme: state.preferences.theme,
    difficulty: state.preferences.difficulty,
    preferredMode: state.preferences.preferredMode,
    sound: state.preferences.sound,
    reducedAnimation: state.preferences.reducedAnimation,
    highContrast: state.preferences.highContrast,
    largeText: state.preferences.largeText,
  };

  try {
    localStorage.setItem(
      CONFIG.storageKeys.preferences,
      JSON.stringify(payload),
    );
  } catch { }

  syncCurrentStateToCloudIfSignedIn();
}

function loadPreferences() {
  const defaults = {
    theme: getSystemTheme(),
    difficulty: "normal",
    preferredMode: "daily",
    sound: false,
    reducedAnimation: false,
    highContrast: false,
    largeText: false,
  };

  try {
    const raw = localStorage.getItem(CONFIG.storageKeys.preferences);

    if (!raw) {
      state.preferences = defaults;
      state.mode = defaults.preferredMode;
      return;
    }

    const saved = JSON.parse(raw);

    state.preferences = {
      theme:
        saved?.theme === "light" || saved?.theme === "dark"
          ? saved.theme
          : defaults.theme,
      difficulty:
        saved?.difficulty && CONFIG.modes[saved.difficulty]
          ? saved.difficulty
          : defaults.difficulty,
      preferredMode:
        saved?.preferredMode === "practice"
          ? "practice"
          : defaults.preferredMode,
      sound: typeof saved?.sound === "boolean" ? saved.sound : defaults.sound,
      reducedAnimation:
        typeof saved?.reducedAnimation === "boolean"
          ? saved.reducedAnimation
          : defaults.reducedAnimation,
      highContrast:
        typeof saved?.highContrast === "boolean"
          ? saved.highContrast
          : defaults.highContrast,
      largeText:
        typeof saved?.largeText === "boolean"
          ? saved.largeText
          : defaults.largeText,
    };
  } catch {
    state.preferences = defaults;
  }

  state.mode = state.preferences.preferredMode;
}

function saveStats() {
  const payload = {
    daily: {
      played: state.stats.daily.played,
      won: state.stats.daily.won,
      lost: state.stats.daily.lost,
      currentStreak: state.stats.daily.currentStreak,
      bestStreak: state.stats.daily.bestStreak,
      guessDistribution: state.stats.daily.guessDistribution,
      lastDailySolvedDate: state.stats.daily.lastDailySolvedDate,
      earnedBadges: Array.isArray(state.stats.daily.earnedBadges)
        ? state.stats.daily.earnedBadges
        : [],
    },
    practice: {
      played: state.stats.practice.played,
      won: state.stats.practice.won,
      lost: state.stats.practice.lost,
      guessDistribution: state.stats.practice.guessDistribution,
    },
    bookStats:
      state.stats.bookStats &&
        typeof state.stats.bookStats === "object" &&
        !Array.isArray(state.stats.bookStats)
        ? state.stats.bookStats
        : {},
  };

  try {
    localStorage.setItem(CONFIG.storageKeys.stats, JSON.stringify(payload));
  } catch { }

  syncCurrentStateToCloudIfSignedIn();
}

function loadStats() {
  const defaultDaily = {
    played: 0,
    won: 0,
    lost: 0,
    currentStreak: 0,
    bestStreak: 0,
    guessDistribution: {},
    lastDailySolvedDate: null,
    earnedBadges: [],
  };

  const defaultPractice = {
    played: 0,
    won: 0,
    lost: 0,
    guessDistribution: {},
  };

  const sanitizeGuessDistribution = (value) =>
    value && typeof value === "object" && !Array.isArray(value) ? value : {};

  const sanitizeNonNegativeInt = (value, fallback = 0) =>
    Number.isInteger(value) && value >= 0 ? value : fallback;

  const sanitizeBookStats = (value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};

    const output = {};

    Object.entries(value).forEach(([key, entry]) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return;

      output[key] = {
        plays: sanitizeNonNegativeInt(entry.plays),
        solves: sanitizeNonNegativeInt(entry.solves),
        bestAttempts:
          Number.isInteger(entry.bestAttempts) && entry.bestAttempts > 0
            ? entry.bestAttempts
            : null,
        totalAttempts: sanitizeNonNegativeInt(entry.totalAttempts),
        lastSolvedDate:
          typeof entry.lastSolvedDate === "string" || entry.lastSolvedDate === null
            ? entry.lastSolvedDate
            : null,
      };
    });

    return output;
  };

  try {
    const raw = localStorage.getItem(CONFIG.storageKeys.stats);

    if (!raw) {
      state.stats = {
        daily: defaultDaily,
        practice: defaultPractice,
        bookStats: {},
      };
      return;
    }

    const saved = JSON.parse(raw);

    const hasNestedShape =
      saved?.daily &&
      typeof saved.daily === "object" &&
      saved?.practice &&
      typeof saved.practice === "object";

    if (hasNestedShape) {
      state.stats = {
        daily: {
          played: sanitizeNonNegativeInt(saved.daily.played),
          won: sanitizeNonNegativeInt(saved.daily.won),
          lost: sanitizeNonNegativeInt(saved.daily.lost),
          currentStreak: sanitizeNonNegativeInt(saved.daily.currentStreak),
          bestStreak: sanitizeNonNegativeInt(saved.daily.bestStreak),
          guessDistribution: sanitizeGuessDistribution(saved.daily.guessDistribution),
          lastDailySolvedDate:
            typeof saved.daily.lastDailySolvedDate === "string" ||
              saved.daily.lastDailySolvedDate === null
              ? saved.daily.lastDailySolvedDate
              : null,
          earnedBadges: Array.isArray(saved.daily.earnedBadges)
            ? saved.daily.earnedBadges.filter((badgeId) =>
              STREAK_BADGES.some((badge) => badge.id === badgeId),
            )
            : [],
        },
        practice: {
          played: sanitizeNonNegativeInt(saved.practice.played),
          won: sanitizeNonNegativeInt(saved.practice.won),
          lost: sanitizeNonNegativeInt(saved.practice.lost),
          guessDistribution: sanitizeGuessDistribution(saved.practice.guessDistribution),
        },
        bookStats: sanitizeBookStats(saved.bookStats),
      };
      return;
    }

    state.stats = {
      daily: {
        played: sanitizeNonNegativeInt(saved?.played),
        won: sanitizeNonNegativeInt(saved?.won),
        lost: sanitizeNonNegativeInt(saved?.lost),
        currentStreak: sanitizeNonNegativeInt(saved?.currentStreak),
        bestStreak: sanitizeNonNegativeInt(saved?.bestStreak),
        guessDistribution: sanitizeGuessDistribution(saved?.guessDistribution),
        lastDailySolvedDate:
          typeof saved?.lastDailySolvedDate === "string" ||
            saved?.lastDailySolvedDate === null
            ? saved.lastDailySolvedDate
            : null,
        earnedBadges: Array.isArray(saved?.earnedBadges)
          ? saved.earnedBadges.filter((badgeId) =>
            STREAK_BADGES.some((badge) => badge.id === badgeId),
          )
          : [],
      },
      practice: defaultPractice,
      bookStats: sanitizeBookStats(saved?.bookStats),
    };
  } catch {
    state.stats = {
      daily: defaultDaily,
      practice: defaultPractice,
      bookStats: {},
    };
  }
}

function hasRecordedDailyResult(date) {
  return state.stats.daily.lastDailySolvedDate === date;
}

function getEarnedBadgeIds() {
  return Array.isArray(state.stats?.daily?.earnedBadges)
    ? state.stats.daily.earnedBadges
    : [];
}

function computeNewlyEarnedBadges() {
  const earnedBadgeIds = new Set(getEarnedBadgeIds());
  const currentStreak =
    Number.isInteger(state.stats?.daily?.currentStreak) &&
      state.stats.daily.currentStreak >= 0
      ? state.stats.daily.currentStreak
      : 0;

  return STREAK_BADGES.filter(
    (badge) => currentStreak >= badge.threshold && !earnedBadgeIds.has(badge.id),
  );
}

function awardStreakBadges() {
  const existing = [...getEarnedBadgeIds()];
  const existingSet = new Set(existing);
  const newlyEarned = computeNewlyEarnedBadges();

  if (!newlyEarned.length) return [];

  newlyEarned.forEach((badge) => {
    if (!existingSet.has(badge.id)) {
      existing.push(badge.id);
      existingSet.add(badge.id);
    }
  });

  state.stats.daily.earnedBadges = existing;
  return newlyEarned;
}

function updateBookStats(outcome) {
  if (!state.currentPuzzle || state.currentPuzzle.mode !== "daily") return;

  const book = getBookByName(state.currentPuzzle.verse.book);
  if (!book) return;

  const entry = ensureBookStatsEntry(book);
  if (!entry) return;

  entry.plays += 1;

  if (outcome === "won") {
    const attempts = state.guesses.length;
    entry.solves += 1;
    entry.totalAttempts += attempts;
    entry.bestAttempts =
      entry.bestAttempts === null ? attempts : Math.min(entry.bestAttempts, attempts);
    entry.lastSolvedDate = state.currentPuzzle.date ?? getTodayPuzzleDate();
  }
}

function recordPuzzleCompletion(outcome) {
  if (!state.currentPuzzle) return;

  if (state.currentPuzzle.mode === "daily") {
    const completionDate = state.currentPuzzle.date;
    if (completionDate && hasRecordedDailyResult(completionDate)) return;

    state.stats.daily.played += 1;

    if (outcome === "won") {
      state.stats.daily.won += 1;

      const guessCount = state.guesses.length;
      state.stats.daily.guessDistribution[guessCount] =
        (state.stats.daily.guessDistribution[guessCount] ?? 0) + 1;

      if (completionDate) {
        const previousDate = getPreviousDate(completionDate);

        state.stats.daily.currentStreak =
          state.stats.daily.lastDailySolvedDate === previousDate
            ? state.stats.daily.currentStreak + 1
            : 1;

        state.stats.daily.bestStreak = Math.max(
          state.stats.daily.bestStreak,
          state.stats.daily.currentStreak,
        );

        state.stats.daily.lastDailySolvedDate = completionDate;
      }

      awardStreakBadges();
    } else if (outcome === "lost") {
      state.stats.daily.lost += 1;

      if (completionDate) {
        state.stats.daily.currentStreak = 0;
        state.stats.daily.lastDailySolvedDate = completionDate;
      }
    }

    updateBookStats(outcome);
    saveStats();

    submitDailyResultToLeaderboard({
      result: outcome,
      guesses: outcome === "won" ? state.guesses.length : null,
      dateKey: completionDate || getDailyDateKey(),
      puzzleId: getDailyPuzzleId(),
    });

    return;
  }

  if (state.currentPuzzle.mode === "practice") {
    state.stats.practice.played += 1;

    if (outcome === "won") {
      state.stats.practice.won += 1;

      const guessCount = state.guesses.length;
      state.stats.practice.guessDistribution[guessCount] =
        (state.stats.practice.guessDistribution[guessCount] ?? 0) + 1;
    } else if (outcome === "lost") {
      state.stats.practice.lost += 1;
    }

    saveStats();
  }
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  state.preferences.theme = theme;
}

function renderThemeToggle() {
  const toggle = elements.themeToggle;
  if (!toggle) return;

  toggle.innerHTML =
    state.preferences.theme === "dark"
      ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="5"></circle><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path></svg>'
      : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';

  toggle.setAttribute(
    "aria-label",
    `Switch to ${state.preferences.theme === "dark" ? "light" : "dark"} mode`,
  );
}

function initTheme() {
  applyTheme(state.preferences.theme);
  renderThemeToggle();
}

function setAuthStatus(message) {
  if (elements.authStatus) {
    elements.authStatus.textContent = message;
  }
}

function renderAuthUI() {
  const { enabled, ready, user, syncing } = state.auth;

  if (!elements.signInBtn || !elements.signOutBtn || !elements.authStatus) return;

  if (!enabled) {
    elements.signInBtn.hidden = false;
    elements.signInBtn.disabled = true;
    elements.signOutBtn.hidden = true;
    setAuthStatus(ready ? "Sign-in unavailable" : "Playing locally");
    return;
  }

  if (!ready) {
    elements.signInBtn.hidden = false;
    elements.signInBtn.disabled = true;
    elements.signOutBtn.hidden = true;
    setAuthStatus("Checking sign-in…");
    return;
  }

  if (syncing) {
    elements.signInBtn.hidden = !!user && !user.isAnonymous;
    elements.signInBtn.disabled = true;
    elements.signOutBtn.hidden = !user || user.isAnonymous;
    elements.signOutBtn.disabled = true;
    setAuthStatus("Syncing…");
    return;
  }

  if (user?.isAnonymous) {
    elements.signInBtn.hidden = false;
    elements.signInBtn.disabled = false;
    elements.signInBtn.textContent = "Sign in";
    elements.signOutBtn.hidden = true;
    setAuthStatus(`Playing anonymously as ${getPublicUserName(user)}`);
    return;
  }

  if (user) {
    elements.signInBtn.hidden = true;
    elements.signOutBtn.hidden = false;
    elements.signOutBtn.disabled = false;
    setAuthStatus(`Signed in as ${getPublicUserName(user)}`);
    return;
  }

  elements.signInBtn.hidden = false;
  elements.signInBtn.disabled = false;
  elements.signInBtn.textContent = "Sign in";
  elements.signOutBtn.hidden = true;
  setAuthStatus("Playing locally");
}

function formatDate() {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getMaxGuesses() {
  return (
    CONFIG.modes[state.preferences.difficulty]?.maxGuesses
    ?? CONFIG.modes.normal.maxGuesses
  );
}

function getCurrentModeConfig() {
  return CONFIG.modes[state.preferences.difficulty] ?? CONFIG.modes.normal;
}

function getHintSchedule() {
  return getCurrentModeConfig().hintSchedule ?? {
    testamentAt: 1,
    sectionAt: 2,
    firstLetterAt: 4,
    referenceAt: 6,
  };
}

function isGameOver() {
  return state.status === "won" || state.status === "lost";
}

function canChangeDifficulty() {
  return state.guesses.length === 0 && state.status === "playing";
}

function getHintLines() {
  const target = getBookByName(state.currentPuzzle?.verse.book);
  if (!target) return [];

  const guessCount = state.guesses.length;
  const difficulty = state.preferences.difficulty;
  const schedule = getHintSchedule();
  const lines = [];

  const shouldRevealTestament =
    Number.isInteger(schedule.testamentAt) &&
    guessCount >= schedule.testamentAt;

  const shouldRevealSection =
    Number.isInteger(schedule.sectionAt) &&
    guessCount >= schedule.sectionAt;

  const shouldRevealFirstLetter =
    Number.isInteger(schedule.firstLetterAt) &&
    guessCount >= schedule.firstLetterAt;

  const shouldRevealReference =
    Number.isInteger(schedule.referenceAt) &&
    guessCount >= schedule.referenceAt;

  if (shouldRevealTestament) {
    lines.push(`It is in the ${target.testament} Testament.`);
  }

  if (shouldRevealSection) {
    lines.push(`It is in the ${target.section} section.`);
  }

  if (shouldRevealFirstLetter) {
    lines.push(`Its first letter is ${target.firstLetter}.`);
  } else if (guessCount === 0) {
    if (difficulty === "easy") {
      lines.push("The first letter will appear soon.");
    } else if (difficulty === "hard") {
      lines.push("Only limited hints are available in Hard mode.");
    } else {
      lines.push("The first letter is hidden until later guesses.");
    }
  } else if (difficulty === "easy") {
    lines.push("The first letter will appear soon.");
  } else if (difficulty === "hard") {
    lines.push("The first letter stays hidden until much later.");
  } else {
    lines.push("The first letter is hidden until later guesses.");
  }

  if (shouldRevealReference) {
    lines.push(`Reference: ${state.currentPuzzle.verse.reference}.`);
  } else if (
    difficulty === "hard" &&
    schedule.referenceAt === null &&
    guessCount > 0
  ) {
    lines.push("No reference hint is available in Hard mode.");
  }

  return lines;
}

function compareGuess(guessName) {
  const target = getBookByName(state.currentPuzzle?.verse.book);
  const guess = getBookByName(guessName);

  if (!target || !guess) return null;

  const distance = getBookDistance(target, guess);
  const sameTestament = guess.testament === target.testament;
  const proximity = getProximityLabel(distance, sameTestament);

  return {
    book: guess.name,
    distance,
    proximity,
    testament: {
      value: guess.testament,
      state: sameTestament ? "correct" : "wrong",
    },
    section: {
      value: guess.section,
      state: isSameSection(guess, target)
        ? "correct"
        : sameTestament
          ? "partial"
          : "wrong",
    },
    firstLetter: {
      value: guess.firstLetter,
      state: guess.firstLetter === target.firstLetter ? "correct" : "wrong",
    },
    bookResult: {
      value: guess.name,
      state:
        proximity === "exact"
          ? "correct"
          : proximity === "very close" || proximity === "near"
            ? "partial"
            : "wrong",
    },
    solved: guess.name === target.name,
  };
}

function getAttemptLabel() {
  if (state.status === "won") return "You solved it";
  if (state.status === "lost") return "Out of guesses";
  if (state.guesses.length === 0) return "Start guessing";
  return "Guess again";
}

function syncPreferenceControls() {
  const allowDifficultyChange = canChangeDifficulty();

  if (elements.difficultySelect) {
    elements.difficultySelect.value = state.preferences.difficulty;
    elements.difficultySelect.disabled = !allowDifficultyChange;
    elements.difficultySelect.setAttribute(
      "aria-disabled",
      String(!allowDifficultyChange),
    );
    elements.difficultySelect.title = allowDifficultyChange
      ? "Choose difficulty before your first guess."
      : "Difficulty can only be changed before starting a puzzle.";
  }

  if (elements.modeSelect) {
    elements.modeSelect.value = state.mode;
    elements.modeSelect.disabled = false;
    elements.modeSelect.setAttribute("aria-disabled", "false");
    elements.modeSelect.title = "Switch between Daily and Practice mode.";
  }
}

function syncActionButtons() {
  if (elements.nextPracticeBtn) {
    elements.nextPracticeBtn.hidden = !(state.mode === "practice" && isGameOver());
  }

  if (elements.statsBtn) {
    elements.statsBtn.hidden = state.mode !== "daily";
  }
}

function renderPuzzleCard() {
  elements.verseText.textContent = state.currentPuzzle?.verse.text ?? "";
  elements.dateLabel.textContent =
    state.mode === "daily"
      ? `Daily puzzle · ${formatDate()}`
      : "Practice puzzle";

  if (state.mode === "daily") {
    startCountdownTimer();
    return;
  }

  stopCountdownTimer();

  if (elements.countdownTimer?.parentElement) {
    elements.countdownTimer.parentElement.classList.add("hidden");
    elements.countdownTimer.parentElement.classList.add("is-muted");
  }
}

function renderHintBlock() {
  const lines = getHintLines();

  elements.hintBlock.innerHTML = lines
    .map((line) => `<p class="meta-line">${line}</p>`)
    .join("");

  elements.attemptLabel.textContent = getAttemptLabel();
}

function renderEmptyGuessRows() {
  elements.guessRows.innerHTML = `
    <div class="guess-grid">
      <div class="empty-state">No guesses yet</div>
      <div class="empty-state">Section clue appears after each guess</div>
      <div class="empty-state">First letter narrows the answer</div>
      <div class="empty-state">Book proximity helps you triangulate</div>
    </div>
  `;
}

function renderGuessRow(guess, rowIndex, animate = false) {
  const baseDelay = animate ? rowIndex * 200 : 0;

  return `
    <div class="guess-grid" aria-label="Guess ${guess.book}">
      <div class="guess-card ${guess.testament.state}${animate ? " reveal-animate" : ""}" style="--reveal-delay: ${baseDelay}ms">${guess.testament.value}</div>
      <div class="guess-card ${guess.section.state}${animate ? " reveal-animate" : ""}" style="--reveal-delay: ${baseDelay + 180}ms">${guess.section.value}</div>
      <div class="guess-card ${guess.firstLetter.state}${animate ? " reveal-animate" : ""}" style="--reveal-delay: ${baseDelay + 360}ms">${guess.firstLetter.value}</div>
      <div class="guess-card ${guess.bookResult.state}${animate ? " reveal-animate" : ""}" style="--reveal-delay: ${baseDelay + 540}ms">${guess.bookResult.value}</div>
    </div>
  `;
}

function renderGuessRows(animateLatest = false) {
  if (!state.guesses.length) {
    renderEmptyGuessRows();
    return;
  }

  const guessesToRender = [...state.guesses].reverse();
  const latestGuess = state.guesses[state.guesses.length - 1];

  elements.guessRows.innerHTML = guessesToRender
    .map((guess, index) => {
      const originalIndex = state.guesses.length - 1 - index;
      const shouldAnimate = animateLatest && guess === latestGuess;
      return renderGuessRow(guess, originalIndex, shouldAnimate);
    })
    .join("");
}

function renderProximityLine() {
  if (!elements.proximityLine) return;

  const lastGuess = state.guesses[state.guesses.length - 1];
  elements.proximityLine.textContent = getProximityDescription(lastGuess);
}

function renderStatus(message = "Guess the book from the verse above.") {
  elements.statusLine.textContent = message;
}

function computeModeStatsSummary(mode = "daily") {
  const source = mode === "practice" ? state.stats.practice : state.stats.daily;

  const played =
    Number.isInteger(source?.played) && source.played >= 0 ? source.played : 0;
  const won = Number.isInteger(source?.won) && source.won >= 0 ? source.won : 0;
  const lost =
    Number.isInteger(source?.lost) && source.lost >= 0 ? source.lost : 0;
  const currentStreak =
    mode === "daily" &&
      Number.isInteger(source?.currentStreak) &&
      source.currentStreak >= 0
      ? source.currentStreak
      : 0;
  const bestStreak =
    mode === "daily" &&
      Number.isInteger(source?.bestStreak) &&
      source.bestStreak >= 0
      ? source.bestStreak
      : 0;

  const rawDistribution =
    source?.guessDistribution &&
      typeof source.guessDistribution === "object" &&
      !Array.isArray(source.guessDistribution)
      ? source.guessDistribution
      : {};

  const maxGuesses = 8;
  const guessDistribution = {};
  for (let i = 1; i <= maxGuesses; i += 1) {
    const value = rawDistribution[i] ?? rawDistribution[String(i)] ?? 0;
    guessDistribution[i] = Number.isInteger(value) && value >= 0 ? value : 0;
  }

  return {
    mode,
    played,
    won,
    lost,
    currentStreak,
    bestStreak,
    guessDistribution,
  };
}

function renderPostGameStats(mode) {
  const statsObj = computeModeStatsSummary(mode);
  const isDaily = mode === "daily";

  if (elements.postGameStatsLabel) {
    elements.postGameStatsLabel.textContent = isDaily
      ? "Daily stats"
      : "Practice stats";
  }

  if (elements.postGameStatsPlayed) {
    elements.postGameStatsPlayed.textContent = String(statsObj.played);
  }
  if (elements.postGameStatsWon) {
    elements.postGameStatsWon.textContent = String(statsObj.won);
  }
  if (elements.postGameStatsLost) {
    elements.postGameStatsLost.textContent = String(statsObj.lost);
  }

  if (elements.postGameStatsGridSecondary) {
    elements.postGameStatsGridSecondary.hidden = !isDaily;
  }
  if (elements.postGameCurrentStreakItem) {
    elements.postGameCurrentStreakItem.hidden = !isDaily;
  }
  if (elements.postGameBestStreakItem) {
    elements.postGameBestStreakItem.hidden = !isDaily;
  }

  if (isDaily) {
    if (elements.postGameStatsCurrentStreak) {
      elements.postGameStatsCurrentStreak.textContent = String(statsObj.currentStreak);
    }
    if (elements.postGameStatsBestStreak) {
      elements.postGameStatsBestStreak.textContent = String(statsObj.bestStreak);
    }
  }

  if (elements.postGameGuessDistribution) {
    renderStatsSection(statsObj, elements.postGameGuessDistribution);
  }
}

function renderStatsSection(statsObj, container) {
  if (!container) return;

  const safeStats = statsObj ?? computeStatsSummary();
  const totalWins = safeStats.won;
  const guessKeys = Object.keys(safeStats.guessDistribution || {})
    .map(Number)
    .sort((a, b) => a - b);

  const maxCount = guessKeys.reduce(
    (max, key) => Math.max(max, safeStats.guessDistribution[key] || 0),
    0,
  );

  container.innerHTML = "";

  if (safeStats.played <= 0 && totalWins <= 0 && safeStats.lost <= 0) {
    const empty = document.createElement("p");
    empty.className = "dist-empty";
    empty.textContent = "No stats yet. Get playing to see your guess distribution here!";
    container.appendChild(empty);
    return;
  }

  guessKeys.forEach((attempt) => {
    const count = safeStats.guessDistribution[attempt] || 0;

    const row = document.createElement("div");
    row.className = "dist-row";

    const label = document.createElement("div");
    label.className = "dist-label";
    label.textContent = `${attempt}`;
    label.setAttribute("aria-label", `Guess distribution, ${attempt} attempts`);

    const track = document.createElement("div");
    track.className = "dist-track";

    const bar = document.createElement("div");
    bar.className = "dist-bar";
    bar.style.width = `${maxCount > 0 ? Math.max((count / maxCount) * 100, count > 0 ? 8 : 0) : 0}%`;
    bar.setAttribute("aria-hidden", "true");
    track.appendChild(bar);

    const value = document.createElement("div");
    value.className = "dist-count";
    value.textContent = String(count);

    row.appendChild(label);
    row.appendChild(track);
    row.appendChild(value);
    container.appendChild(row);
  });
}

function renderEarnedBadges(container) {
  if (!container) return;

  const earnedIds = new Set(getEarnedBadgeIds());

  container.innerHTML = STREAK_BADGES.map((badge) => {
    const isEarned = earnedIds.has(badge.id);
    const badgeClass = isEarned
      ? "streak-badge is-earned"
      : "streak-badge is-locked";
    const badgeLabel = isEarned
      ? `Earned badge: ${badge.label}`
      : `Locked badge: ${badge.label}`;

    return `
      <span class="${badgeClass}" aria-label="${badgeLabel}">
        <span class="streak-badge-text">${badge.label}</span>
        <span class="streak-badge-state">${isEarned ? "Earned" : "Locked"}</span>
      </span>
    `;
  }).join("");

  if (!getEarnedBadgeIds().length) {
    container.insertAdjacentHTML(
      "beforeend",
      `<p class="streak-badges-empty">No streak badges yet — keep your Daily win streak going.</p>`,
    );
  }
}

function formatTriviaLabel(value) {
  if (!value) return "";

  return String(value)
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildTriviaContent(puzzle, book) {
  if (!puzzle && !book) {
    return {
      title: "",
      text: "",
      chips: [],
    };
  }

  const verseThemes = Array.isArray(puzzle?.themes) ? puzzle.themes : [];
  const bookThemes = Array.isArray(book?.bookThemes) ? book.bookThemes : [];
  const combinedThemes = [...new Set([...verseThemes, ...bookThemes])].slice(0, 3);
  const chips = [];

  if (book?.testament) {
    chips.push(`${book.testament} Testament`);
  }

  if (book?.section) {
    chips.push(book.section);
  }

  if (combinedThemes.length) {
    chips.push(`Themes: ${combinedThemes.map(formatTriviaLabel).join(", ")}`);
  }

  if (puzzle?.difficulty) {
    chips.push(`Difficulty: ${formatTriviaLabel(puzzle.difficulty)}`);
  }

  const title =
    puzzle?.clue ||
    book?.bookIntroTitle ||
    `Learn more about ${puzzle?.book ?? book?.name ?? "this book"}`;

  const textParts = [];

  if (puzzle?.explanation) {
    textParts.push(puzzle.explanation);
  } else if (puzzle?.clue) {
    textParts.push(puzzle.clue);
  }

  if (book?.bookThemes?.length) {
    const themeText = book.bookThemes
      .slice(0, 3)
      .map(formatTriviaLabel)
      .join(", ");

    textParts.push(`${book.name} often emphasizes themes such as ${themeText}.`);
  } else if (verseThemes.length) {
    const verseThemeText = verseThemes
      .slice(0, 3)
      .map(formatTriviaLabel)
      .join(", ");

    textParts.push(`This verse highlights themes such as ${verseThemeText}.`);
  }

  if (puzzle?.devotional) {
    textParts.push(puzzle.devotional);
  }

  const uniqueParts = [];
  textParts.forEach((part) => {
    const trimmed = String(part || "").trim();
    if (!trimmed) return;
    if (uniqueParts.includes(trimmed)) return;
    uniqueParts.push(trimmed);
  });

  return {
    title,
    text: uniqueParts.slice(0, 2).join(" "),
    chips,
  };
}

function renderTriviaSection(content) {
  const {
    postGameTriviaSection,
    postGameTriviaTitle,
    postGameTriviaText,
    postGameTriviaChips,
  } = elements;

  if (
    !postGameTriviaSection ||
    !postGameTriviaTitle ||
    !postGameTriviaText ||
    !postGameTriviaChips
  ) {
    return;
  }

  const hasTitle = !!content?.title;
  const hasText = !!content?.text;
  const hasChips = Array.isArray(content?.chips) && content.chips.length > 0;

  if (!hasTitle && !hasText && !hasChips) {
    postGameTriviaSection.hidden = true;
    postGameTriviaTitle.textContent = "";
    postGameTriviaText.textContent = "";
    postGameTriviaChips.innerHTML = "";
    return;
  }

  postGameTriviaSection.hidden = false;
  postGameTriviaTitle.textContent = content.title || "Learn more";
  postGameTriviaText.textContent = content.text || "";
  postGameTriviaChips.innerHTML = (content.chips || [])
    .map((chip) => `<span class="postgame-chip">${chip}</span>`)
    .join("");
}

function getPostGameContent() {
  const puzzle = state.currentPuzzle?.verse;
  if (!puzzle) return null;

  const book = getBookByName(puzzle.book);

  return {
    title: state.status === "won" ? "Well done" : "Game over",
    badge: state.status === "won" ? "Solved" : "Failed",
    reference: puzzle.reference,
    bookName: puzzle.book,
    verseText: puzzle.text,
    explanation: puzzle.explanation ?? "",
    introTitle: book?.bookIntroTitle ?? "",
    introText: book?.bookIntroText ?? "",
    devotionalText: puzzle.devotional ?? book?.devotionalText ?? "",
    trivia: buildTriviaContent(puzzle, book),
  };
}

function computeArchiveSummary() {
  const totalBooks = books.length;
  const solvedBooks = books.filter((book) => {
    const entry = getBookStats(book);
    return entry && entry.solves > 0;
  }).length;

  const completionPercentage =
    totalBooks > 0 ? Math.round((solvedBooks / totalBooks) * 100) : 0;

  const testamentSummary = books.reduce((acc, book) => {
    const key = book.testament;
    if (!acc[key]) {
      acc[key] = { total: 0, solved: 0, totalAttempts: 0, solveCount: 0 };
    }

    acc[key].total += 1;

    const entry = getBookStats(book);
    if (entry && entry.solves > 0) {
      acc[key].solved += 1;
      acc[key].totalAttempts += entry.totalAttempts;
      acc[key].solveCount += entry.solves;
    }

    return acc;
  }, {});

  const sectionSummary = books.reduce((acc, book) => {
    const key = book.section;
    if (!acc[key]) {
      acc[key] = { total: 0, solved: 0, totalAttempts: 0, solveCount: 0 };
    }

    acc[key].total += 1;

    const entry = getBookStats(book);
    if (entry && entry.solves > 0) {
      acc[key].solved += 1;
      acc[key].totalAttempts += entry.totalAttempts;
      acc[key].solveCount += entry.solves;
    }

    return acc;
  }, {});

  return {
    totalBooks,
    solvedBooks,
    completionPercentage,
    testamentSummary,
    sectionSummary,
  };
}

function formatArchiveAverage(totalAttempts, solveCount) {
  if (!solveCount) return "—";
  return (totalAttempts / solveCount).toFixed(1);
}

function renderArchiveBars(summaryObj) {
  return Object.entries(summaryObj)
    .map(([label, value]) => {
      const percentage = value.total > 0 ? (value.solved / value.total) * 100 : 0;

      return `
        <div class="archive-bar-row">
          <div class="archive-bar-topline">
            <span class="archive-bar-label">${label}</span>
            <span>${value.solved}/${value.total} · Avg ${formatArchiveAverage(value.totalAttempts, value.solveCount)}</span>
          </div>
          <div class="archive-bar-track" aria-hidden="true">
            <div class="archive-bar-fill" style="width: ${percentage}%"></div>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderArchiveSummary() {
  if (!elements.archiveSummary) return;

  const summary = computeArchiveSummary();

  elements.archiveSummary.innerHTML = `
    <div class="archive-summary-blocks">
      <section class="archive-summary-group" aria-label="Overall archive progress">
        <p class="archive-summary-title">Overall</p>
        <div class="archive-kpis">
          <div class="archive-kpi">
            <span class="archive-kpi-value">${summary.solvedBooks}/${summary.totalBooks}</span>
            <span class="archive-kpi-label">Books solved</span>
          </div>
          <div class="archive-kpi">
            <span class="archive-kpi-value">${summary.completionPercentage}%</span>
            <span class="archive-kpi-label">Canon complete</span>
          </div>
        </div>
      </section>

      <section class="archive-stat-group" aria-label="Solved books by testament">
        <h3>By testament</h3>
        <div class="archive-bars">
          ${renderArchiveBars(summary.testamentSummary)}
        </div>
      </section>

      <section class="archive-stat-group" aria-label="Solved books by section">
        <h3>By section</h3>
        <div class="archive-bars">
          ${renderArchiveBars(summary.sectionSummary)}
        </div>
      </section>
    </div>
  `;
}

function renderArchiveGrid(selectedBookKey = "") {
  if (!elements.archiveGrid) return;

  elements.archiveGrid.innerHTML = books
    .map((book) => {
      const entry = getBookStats(book);
      const key = getBookStatsKey(book);
      const stateClass = getArchiveCellState(book);
      const stateLabel = getArchiveCellStateLabel(book);
      const average = getAverageAttemptsForBook(book);

      const metaLine =
        entry && entry.solves > 0
          ? `Best ${entry.bestAttempts ?? "—"} · Avg ${average ? average.toFixed(1) : "—"}`
          : entry && entry.plays > 0
            ? `Played ${entry.plays} · Unsolved`
            : `${book.testament} · ${book.section}`;

      return `
        <button
          type="button"
          class="archive-cell ${stateClass}${selectedBookKey === key ? " is-selected" : ""}"
          data-book-key="${key}"
          aria-label="${getArchiveCellAriaLabel(book)}"
          aria-pressed="${selectedBookKey === key ? "true" : "false"}"
        >
          <div class="archive-cell-top">
            <span class="archive-cell-order">#${book.order}</span>
            <span class="archive-cell-state">${stateLabel}</span>
          </div>
          <div class="archive-cell-book">${book.name}</div>
          <div class="archive-cell-meta">${metaLine}</div>
        </button>
      `;
    })
    .join("");
}

function renderArchiveDetails(bookKey = "") {
  if (!elements.archiveDetails) return;

  const fallbackBook = books[0];
  const book =
    books.find((item) => getBookStatsKey(item) === bookKey) || fallbackBook;

  if (!book) {
    elements.archiveDetails.innerHTML =
      '<p class="archive-details-empty">Select a book to view archive details.</p>';
    return;
  }

  const entry = getBookStats(book);
  const average = getAverageAttemptsForBook(book);
  const solved = entry?.solves ?? 0;
  const plays = entry?.plays ?? 0;
  const bestAttempts = entry?.bestAttempts ?? "—";
  const lastSolvedDate = entry?.lastSolvedDate ?? "Not yet solved";
  const stateLabel = getArchiveCellStateLabel(book);

  elements.archiveDetails.innerHTML = `
    <div class="archive-details-header">
      <div class="archive-details-title">${book.name}</div>
      <div class="archive-details-subtitle">${book.testament} Testament · ${book.section} · Canon #${book.order}</div>
    </div>

    <div class="archive-details-grid">
      <div class="archive-detail-stat">
        <span class="archive-detail-stat-value">${plays}</span>
        <span class="archive-detail-stat-label">Daily plays</span>
      </div>
      <div class="archive-detail-stat">
        <span class="archive-detail-stat-value">${solved}</span>
        <span class="archive-detail-stat-label">Daily solves</span>
      </div>
      <div class="archive-detail-stat">
        <span class="archive-detail-stat-value">${bestAttempts}</span>
        <span class="archive-detail-stat-label">Best attempts</span>
      </div>
      <div class="archive-detail-stat">
        <span class="archive-detail-stat-value">${average ? average.toFixed(1) : "—"}</span>
        <span class="archive-detail-stat-label">Average attempts</span>
      </div>
    </div>

    <p class="archive-details-copy">
      Status: ${stateLabel}. Last solved date: ${lastSolvedDate}. This archive tracks Daily mode progress only, so books still appear here even if they have never been played.
    </p>
  `;
}

async function openLeaderboardModal() {
  if (!elements.leaderboardModal) return;

  elements.leaderboardModal.dataset.open = "true";
  elements.leaderboardModal.setAttribute("aria-hidden", "false");

  elements.leaderboardSummary.innerHTML = `
    <div class="leaderboard-empty">Loading global daily stats…</div>
  `;
  elements.leaderboardList.innerHTML = "";
  elements.leaderboardUserRank.innerHTML = "";

  if (!state.auth.enabled || !firebaseDb) {
    elements.leaderboardSummary.innerHTML = `
      <div class="leaderboard-empty">Global stats are unavailable right now.</div>
    `;
    elements.leaderboardList.innerHTML = `
      <div class="leaderboard-empty">Firebase is not available, but local gameplay still works.</div>
    `;
    renderCurrentUserRank(null);
    return;
  }

  const dateKey = getDailyDateKey();

  try {
    const [stats, entries] = await Promise.all([
      fetchDailyGlobalStats(dateKey),
      fetchLeaderboardTopEntries(dateKey),
    ]);

    state.leaderboard.stats = stats;
    state.leaderboard.entries = entries;

    renderLeaderboardSummary(stats);
    renderLeaderboardList(entries);
  } catch (error) {
    console.error("Leaderboard stats/list load failed:", error);
    elements.leaderboardSummary.innerHTML = `
      <div class="leaderboard-empty">Could not load today’s global stats.</div>
    `;
    elements.leaderboardList.innerHTML = `
      <div class="leaderboard-empty">Please try again later.</div>
    `;
    renderCurrentUserRank(null);
    return;
  }

  if (!state.auth.user?.uid) {
    renderCurrentUserRank(null);
    return;
  }

  elements.leaderboardUserRank.innerHTML = `
    <div class="leaderboard-empty">Loading your placement…</div>
  `;

  try {
    const userRank = await fetchCurrentUserRank(dateKey, state.auth.user.uid);
    state.leaderboard.userRank = userRank;
    renderCurrentUserRank(userRank);
  } catch (error) {
    console.error("Leaderboard rank load failed:", error);
    elements.leaderboardUserRank.innerHTML = `
      <div class="leaderboard-empty">Could not load your personal placement yet.</div>
    `;
  }
}

function closeLeaderboardModal() {
  if (!elements.leaderboardModal) return;
  elements.leaderboardModal.dataset.open = "false";
  elements.leaderboardModal.setAttribute("aria-hidden", "true");
}

function openArchiveModal() {
  if (!elements.archiveModal) return;

  const selectedBook =
    books.find((book) => {
      const entry = getBookStats(book);
      return entry && entry.plays > 0;
    }) || books[0];

  const selectedKey = selectedBook ? getBookStatsKey(selectedBook) : "";

  renderArchiveSummary();
  renderArchiveGrid(selectedKey);
  renderArchiveDetails(selectedKey);
  setModalOpen(elements.archiveModal, true);
}

function closeArchiveModal() {
  setModalOpen(elements.archiveModal, false);
}

function renderStatsModal() {
  const dailyStats = computeModeStatsSummary("daily");
  const practiceStats = computeModeStatsSummary("practice");

  if (elements.statsPlayed) {
    elements.statsPlayed.textContent = String(dailyStats.played);
  }
  if (elements.statsWon) {
    elements.statsWon.textContent = String(dailyStats.won);
  }
  if (elements.statsLost) {
    elements.statsLost.textContent = String(dailyStats.lost);
  }
  if (elements.statsCurrentStreak) {
    elements.statsCurrentStreak.textContent = String(dailyStats.currentStreak);
  }
  if (elements.statsBestStreak) {
    elements.statsBestStreak.textContent = String(dailyStats.bestStreak);
  }
  if (elements.statsGuessDistribution) {
    renderStatsSection(dailyStats, elements.statsGuessDistribution);
  }
  if (elements.statsModalBadges) {
    renderEarnedBadges(elements.statsModalBadges);
  }

  if (elements.practiceStatsPlayed) {
    elements.practiceStatsPlayed.textContent = String(practiceStats.played);
  }
  if (elements.practiceStatsWon) {
    elements.practiceStatsWon.textContent = String(practiceStats.won);
  }
  if (elements.practiceStatsLost) {
    elements.practiceStatsLost.textContent = String(practiceStats.lost);
  }
  if (elements.practiceStatsGuessDistribution) {
    renderStatsSection(practiceStats, elements.practiceStatsGuessDistribution);
  }
}

function renderPostGamePanel() {
  if (!elements.postGameModal) return;

  const content = getPostGameContent();

  if (!content || !isGameOver()) {
    elements.postGameModal.dataset.open = "false";
    elements.postGameModal.setAttribute("aria-hidden", "true");
    state.postGameOpen = false;
    return;
  }

  elements.postGameTitle.textContent = content.title;
  elements.postGameBadge.textContent = content.badge;
  elements.postGameReference.textContent = content.reference;
  elements.postGameBook.textContent = content.bookName;
  elements.postGameVerse.textContent = content.verseText;
  elements.postGameIntroTitle.textContent = content.introTitle;
  elements.postGameIntroText.textContent = content.introText;
  elements.postGameNextBtn.hidden = state.mode !== "practice";

  renderTriviaSection(content.trivia);
  renderPostGameStats(state.mode);

  elements.postGameModal.dataset.open = "true";
  elements.postGameModal.setAttribute("aria-hidden", "false");
  state.postGameOpen = true;
}

function closePostGamePanel() {
  if (!elements.postGameModal) return;

  elements.postGameModal.dataset.open = "false";
  elements.postGameModal.setAttribute("aria-hidden", "true");
  state.postGameOpen = false;
}

function renderPuzzleView() {
  renderPuzzleCard();
  renderHintBlock();
  renderGuessRows();
  renderProximityLine();
  syncPreferenceControls();
  syncActionButtons();
  renderPostGamePanel();

  if (state.status === "won") {
    renderStatus(
      `Correct — ${state.currentPuzzle.verse.book} (${state.currentPuzzle.verse.reference}).`,
    );
    return;
  }

  if (state.status === "lost") {
    renderStatus(
      `Out of guesses — the answer was ${state.currentPuzzle.verse.book} (${state.currentPuzzle.verse.reference}).`,
    );
    return;
  }

  renderStatus();
}

function resetInput() {
  elements.guessInput.value = "";
  updateComboboxA11y(false);
  saveProgress();
}

function resetSuggestionsState() {
  state.selectedSuggestionIndex = -1;
  state.currentSuggestions = [];
  updateComboboxA11y(false);
}

function closeSuggestions() {
  state.selectedSuggestionIndex = -1;
  elements.autocomplete.dataset.open = "false";
  elements.autocomplete.innerHTML = "";
  updateComboboxA11y(false);
}

function updateComboboxA11y(isOpen) {
  if (!elements.guessInput) return;

  elements.guessInput.setAttribute("aria-expanded", String(isOpen));

  const active =
    isOpen && state.selectedSuggestionIndex >= 0
      ? `suggestion-${state.selectedSuggestionIndex}`
      : "";

  elements.guessInput.setAttribute("aria-activedescendant", active);
}

function openSuggestions() {
  elements.autocomplete.dataset.open = "true";
  updateComboboxA11y(true);
}

function scrollActiveSuggestionIntoView() {
  const active = elements.autocomplete.querySelector('[aria-selected="true"]');
  active?.scrollIntoView({ block: "nearest" });
}

function renderSuggestions() {
  if (!state.currentSuggestions.length) {
    closeSuggestions();
    return;
  }

  elements.autocomplete.innerHTML = state.currentSuggestions
    .map((book, index) => {
      const active = index === state.selectedSuggestionIndex;

      return `
        <button
          id="suggestion-${index}"
          type="button"
          class="suggestion${active ? " is-active" : ""}"
          role="option"
          aria-selected="${active}"
          data-index="${index}"
        >
          ${book.name}
        </button>
      `;
    })
    .join("");

  openSuggestions();
  updateComboboxA11y(state.selectedSuggestionIndex >= 0);
  scrollActiveSuggestionIntoView();
}

function updateSuggestions(query) {
  const value = query.trim().toLowerCase();

  if (!value) {
    resetSuggestionsState();
    closeSuggestions();
    return;
  }

  state.currentSuggestions = books
    .filter((book) => book.name.toLowerCase().includes(value))
    .slice(0, CONFIG.ui.maxSuggestions);

  state.selectedSuggestionIndex = -1;
  renderSuggestions();
}

function handleInvalidGuess() {
  renderStatus("Choose a valid Catholic Bible book from the list.");
}

function handleDuplicateGuess(bookName) {
  renderStatus(`You already tried ${bookName}.`);
}

function refreshAfterGuess(message) {
  renderHintBlock();
  renderGuessRows(true);
  renderProximityLine();
  syncPreferenceControls();
  syncActionButtons();
  renderStatus(message);
  saveProgress();
  renderPuzzleView();
}

function handleSolvedGuess() {
  state.status = "won";
  recordPuzzleCompletion("won");
  refreshAfterGuess(
    `Correct — ${state.currentPuzzle.verse.book} (${state.currentPuzzle.verse.reference}).`,
  );
}

function handleLostGuess() {
  state.status = "lost";
  recordPuzzleCompletion("lost");
  refreshAfterGuess(
    `Out of guesses — the answer was ${state.currentPuzzle.verse.book} (${state.currentPuzzle.verse.reference}).`,
  );
}

function handleIncorrectGuess(bookName) {
  renderHintBlock();
  renderGuessRows(true);
  renderProximityLine();
  syncPreferenceControls();
  syncActionButtons();
  renderStatus(`${bookName} added. Use the colors and clues for your next guess.`);
  saveProgress();
}

function applyGuess(rawGuess) {
  if (isGameOver()) {
    renderPuzzleView();
    return;
  }

  const match = getBookByName(rawGuess);
  if (!match) {
    handleInvalidGuess();
    return;
  }

  if (state.guesses.some((guess) => guess.book === match.name)) {
    handleDuplicateGuess(match.name);
    return;
  }

  const result = compareGuess(match.name);
  if (!result) return;

  state.guesses.push(result);
  resetInput();
  resetSuggestionsState();
  closeSuggestions();

  if (result.solved) {
    handleSolvedGuess();
    return;
  }

  if (state.guesses.length >= getMaxGuesses()) {
    handleLostGuess();
    return;
  }

  handleIncorrectGuess(match.name);
}

function buildShareSummary() {
  return state.guesses
    .map((guess) => {
      const tile = (cell) =>
        cell.state === "correct"
          ? "🟩"
          : cell.state === "partial"
            ? "🟨"
            : "🟥";

      return [
        tile(guess.testament),
        tile(guess.section),
        tile(guess.firstLetter),
        tile(guess.bookResult),
      ].join("");
    })
    .join("\n");
}

function buildShareText() {
  const solved = state.status === "won";
  const guessWord = state.guesses.length === 1 ? "guess" : "guesses";
  const modeLabel = state.mode === "daily" ? "Daily" : "Practice";

  return `Bibdle ${modeLabel} ${formatDate()}
${solved ? "Solved" : state.status === "lost" ? "Lost" : "In progress"} in ${state.guesses.length} ${guessWord}
${buildShareSummary()}`;
}

async function copyResult() {
  try {
    await navigator.clipboard.writeText(buildShareText());
    renderStatus("Result copied to clipboard.");
  } catch {
    renderStatus("Clipboard access is unavailable in this browser.");
  }
}

function setModalOpen(modal, isOpen) {
  if (!modal) return;

  modal.dataset.open = isOpen ? "true" : "false";
  modal.setAttribute("aria-hidden", isOpen ? "false" : "true");
}

function openHelpModal() {
  setModalOpen(elements.helpModal, true);
}

function closeHelpModal() {
  setModalOpen(elements.helpModal, false);
}

function openSettingsModal() {
  if (!elements.settingsModal) return;

  syncSettingsControls();
  setModalOpen(elements.settingsModal, true);
}

function closeSettingsModal() {
  setModalOpen(elements.settingsModal, false);
}

function openStatsModal() {
  if (!elements.statsModal) return;

  renderStatsModal();
  setModalOpen(elements.statsModal, true);
}

function closeStatsModal() {
  setModalOpen(elements.statsModal, false);
}

function syncSettingsControls() {
  if (elements.reducedMotionToggle) {
    elements.reducedMotionToggle.checked = !!state.preferences.reducedAnimation;
  }
  if (elements.highContrastToggle) {
    elements.highContrastToggle.checked = !!state.preferences.highContrast;
  }
  if (elements.largeTextToggle) {
    elements.largeTextToggle.checked = !!state.preferences.largeText;
  }
  if (elements.soundToggle) {
    elements.soundToggle.checked = !!state.preferences.sound;
  }
}

function applyAccessibilityPreferences() {
  document.documentElement.classList.toggle(
    "reduced-motion",
    !!state.preferences.reducedAnimation,
  );
  document.documentElement.classList.toggle(
    "high-contrast",
    !!state.preferences.highContrast,
  );
  document.documentElement.classList.toggle(
    "large-text",
    !!state.preferences.largeText,
  );
}

function handleReducedMotionToggle(event) {
  state.preferences.reducedAnimation = event.target.checked;
  applyAccessibilityPreferences();
  savePreferences();
}

function handleHighContrastToggle(event) {
  state.preferences.highContrast = event.target.checked;
  applyAccessibilityPreferences();
  savePreferences();
}

function handleLargeTextToggle(event) {
  state.preferences.largeText = event.target.checked;
  applyAccessibilityPreferences();
  savePreferences();
}

function handleSoundToggle(event) {
  state.preferences.sound = event.target.checked;
  savePreferences();
}

function handleGuessSubmit(event) {
  event.preventDefault();
  applyGuess(elements.guessInput.value);
}

function handleGuessInput(event) {
  if (isGameOver()) return;

  updateSuggestions(event.target.value);
  saveProgress();
}

function moveSuggestion(nextIndex) {
  if (!state.currentSuggestions.length) return;

  state.selectedSuggestionIndex = nextIndex;
  renderSuggestions();
}

function handleGuessKeydown(event) {
  if (isGameOver()) return;

  const isOpen = elements.autocomplete.dataset.open === "true";
  const hasSuggestions = state.currentSuggestions.length > 0;

  if (!isOpen || !hasSuggestions) {
    if (event.key === "Enter") {
      event.preventDefault();
      applyGuess(elements.guessInput.value);
    }

    if (event.key === "ArrowDown" && hasSuggestions) {
      event.preventDefault();
      state.selectedSuggestionIndex = 0;
      renderSuggestions();
    }

    return;
  }

  if (event.key === "ArrowDown") {
    event.preventDefault();

    const next =
      state.selectedSuggestionIndex < 0
        ? 0
        : Math.min(
          state.selectedSuggestionIndex + 1,
          state.currentSuggestions.length - 1,
        );

    moveSuggestion(next);
    return;
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();

    const next =
      state.selectedSuggestionIndex < 0
        ? state.currentSuggestions.length - 1
        : Math.max(state.selectedSuggestionIndex - 1, 0);

    moveSuggestion(next);
    return;
  }

  if (event.key === "Escape") {
    closeSuggestions();
    return;
  }

  if (event.key === "Enter" && state.selectedSuggestionIndex >= 0) {
    event.preventDefault();
    const picked = state.currentSuggestions[state.selectedSuggestionIndex];
    if (picked) applyGuess(picked.name);
  }
}

function handleSuggestionClick(event) {
  const button = event.target.closest(".suggestion");
  if (!button) return;

  const book = state.currentSuggestions[Number(button.dataset.index)];
  if (book) applyGuess(book.name);
}

function handleDocumentClick(event) {
  if (!elements.guessForm.contains(event.target)) {
    closeSuggestions();
  }
}

function handleArchiveGridClick(event) {
  const button = event.target.closest(".archive-cell");
  if (!button) return;

  const bookKey = button.dataset.bookKey || "";
  renderArchiveGrid(bookKey);
  renderArchiveDetails(bookKey);
}

function handleThemeToggle() {
  const nextTheme = state.preferences.theme === "dark" ? "light" : "dark";
  applyTheme(nextTheme);
  renderThemeToggle();
  savePreferences();
}

function handleDifficultyChange(event) {
  if (!canChangeDifficulty()) {
    syncPreferenceControls();
    renderStatus("Difficulty can only be changed before starting the puzzle.");
    return;
  }

  const value = event.target.value;
  if (!CONFIG.modes[value]) return;

  state.preferences.difficulty = value;
  savePreferences();
  saveProgress();
  syncPreferenceControls();
  renderPuzzleView();
}

function handleModeChange(event) {
  const value = event.target.value;
  if (value !== "daily" && value !== "practice") return;

  state.mode = value;
  state.preferences.preferredMode = value;
  savePreferences();
  resetPuzzle(value);
}

function handleNextPracticePuzzle() {
  if (state.mode !== "practice") return;
  resetPuzzle("practice");
}

function bindBackdropClose(modal, onClose) {
  if (!modal) return;

  modal.addEventListener("click", (event) => {
    if (event.target === modal) onClose();
  });
}

async function writeMergedDataToCloud(uid, mergedData) {
  const profileRef = getUserProfileRef(uid);
  if (!profileRef) return;

  await setDoc(
    profileRef,
    {
      uid,
      preferences: mergedData.preferences,
      stats: mergedData.stats,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

async function loadCloudDataToLocal(user) {
  if (!user?.uid) return false;

  const profileRef = getUserProfileRef(user.uid);
  if (!profileRef) return false;

  const snapshot = await getDoc(profileRef);

  if (!snapshot.exists()) {
    return false;
  }

  const cloudData = sanitizeCloudProfile(snapshot.data());
  const localData = {
    preferences: getLocalPreferencesSnapshot(),
    stats: getLocalStatsSnapshot(),
  };

  const mergedData = mergeLocalAndCloudData(localData, cloudData);

  state.preferences = mergedData.preferences;
  state.stats = mergedData.stats;

  savePreferences();
  saveStats();
  await writeMergedDataToCloud(user.uid, mergedData);

  applyAccessibilityPreferences();
  initTheme();
  syncPreferenceControls();
  renderPuzzleView();
  renderStatsModal();

  return true;
}

async function syncLocalDataToCloud(user) {
  if (!user?.uid) return;

  const mergedData = {
    preferences: getLocalPreferencesSnapshot(),
    stats: getLocalStatsSnapshot(),
  };

  await writeMergedDataToCloud(user.uid, mergedData);
}

async function handleAuthStateChange(user) {
  state.auth.user = user || null;
  state.auth.ready = true;

  if (!user) {
    state.auth.syncing = false;
    renderAuthUI();
    return;
  }

  state.auth.syncing = true;
  renderAuthUI();

  try {
    const hadCloudProfile = await loadCloudDataToLocal(user);

    if (!hadCloudProfile) {
      await syncLocalDataToCloud(user);
    }
  } catch (error) {
    console.error("Auth sync failed:", error);
    if (user.isAnonymous) {
      setAuthStatus(`Playing anonymously as ${getPublicUserName(user)}`);
    } else {
      setAuthStatus("Signed in, cloud sync unavailable");
    }
  } finally {
    state.auth.syncing = false;
    renderAuthUI();
  }
}

function initFirebaseAuth() {
  if (!FIREBASE_ENABLED) {
    state.auth.ready = true;
    state.auth.enabled = false;
    renderAuthUI();
    return;
  }

  try {
    firebaseApp = initializeApp(FIREBASE_CONFIG);
    firebaseAuth = getAuth(firebaseApp);
    firebaseDb = getFirestore(firebaseApp);
    firebaseGoogleProvider = new GoogleAuthProvider();

    state.auth.enabled = true;
    renderAuthUI();

    onAuthStateChanged(firebaseAuth, (user) => {
      handleAuthStateChange(user);
    });
  } catch (error) {
    console.error("Firebase init failed:", error);
    state.auth.ready = true;
    state.auth.enabled = false;
    renderAuthUI();
  }
}

async function handleSignIn() {
  if (!state.auth.enabled || !firebaseAuth || !firebaseGoogleProvider) {
    setAuthStatus("Sign-in unavailable");
    return;
  }

  try {
    state.auth.syncing = true;
    renderAuthUI();

    const currentUser = firebaseAuth.currentUser;

    if (currentUser?.isAnonymous) {
      try {
        await linkWithPopup(currentUser, firebaseGoogleProvider);
        return;
      } catch (error) {
        const collisionCodes = new Set([
          "auth/credential-already-in-use",
          "auth/email-already-in-use",
          "auth/account-exists-with-different-credential",
        ]);

        if (collisionCodes.has(error?.code)) {
          await signInWithPopup(firebaseAuth, firebaseGoogleProvider);
          return;
        }

        throw error;
      }
    }

    await signInWithPopup(firebaseAuth, firebaseGoogleProvider);
  } catch (error) {
    console.error("Sign-in failed:", error);
    state.auth.syncing = false;
    renderAuthUI();
    setAuthStatus("Google sign-in failed");
    renderStatus("Google sign-in failed. You can keep playing locally.");
  }
}

async function handleSignOut() {
  if (!state.auth.enabled || !firebaseAuth) {
    setAuthStatus("Playing locally");
    return;
  }

  if (firebaseAuth.currentUser?.isAnonymous) {
    renderAuthUI();
    return;
  }

  try {
    await firebaseSignOut(firebaseAuth);
    setAuthStatus("Playing locally");
  } catch (error) {
    console.error("Sign-out failed:", error);
    setAuthStatus("Sign-out failed");
  }
}

function bindEvents() {
  elements.guessForm.addEventListener("submit", handleGuessSubmit);
  elements.guessInput.addEventListener("input", handleGuessInput);
  elements.guessInput.addEventListener("keydown", handleGuessKeydown);
  elements.autocomplete.addEventListener("click", handleSuggestionClick);

  document.addEventListener("click", handleDocumentClick);

  elements.helpBtn.addEventListener("click", openHelpModal);
  elements.closeHelpBtn.addEventListener("click", closeHelpModal);
  bindBackdropClose(elements.helpModal, closeHelpModal);

  elements.shareBtn.addEventListener("click", copyResult);

  if (elements.nextPracticeBtn) {
    elements.nextPracticeBtn.addEventListener("click", handleNextPracticePuzzle);
  }

  if (elements.postGameCloseBtn) {
    elements.postGameCloseBtn.addEventListener("click", closePostGamePanel);
  }

  if (elements.postGameNextBtn) {
    elements.postGameNextBtn.addEventListener("click", handleNextPracticePuzzle);
  }

  bindBackdropClose(elements.postGameModal, closePostGamePanel);

  if (elements.themeToggle) {
    elements.themeToggle.addEventListener("click", handleThemeToggle);
  }

  if (elements.difficultySelect) {
    elements.difficultySelect.addEventListener("change", handleDifficultyChange);
  }

  if (elements.modeSelect) {
    elements.modeSelect.addEventListener("change", handleModeChange);
  }

  if (elements.settingsBtn) {
    elements.settingsBtn.addEventListener("click", openSettingsModal);
  }

  if (elements.closeSettingsBtn) {
    elements.closeSettingsBtn.addEventListener("click", closeSettingsModal);
  }

  bindBackdropClose(elements.settingsModal, closeSettingsModal);

  if (elements.reducedMotionToggle) {
    elements.reducedMotionToggle.addEventListener(
      "change",
      handleReducedMotionToggle,
    );
  }

  if (elements.highContrastToggle) {
    elements.highContrastToggle.addEventListener(
      "change",
      handleHighContrastToggle,
    );
  }

  if (elements.largeTextToggle) {
    elements.largeTextToggle.addEventListener("change", handleLargeTextToggle);
  }

  if (elements.soundToggle) {
    elements.soundToggle.addEventListener("change", handleSoundToggle);
  }

  if (elements.statsBtn) {
    elements.statsBtn.addEventListener("click", openStatsModal);
  }

  if (elements.closeStatsBtn) {
    elements.closeStatsBtn.addEventListener("click", closeStatsModal);
  }

  bindBackdropClose(elements.statsModal, closeStatsModal);

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;

    if (elements.settingsModal?.dataset.open === "true") {
      closeSettingsModal();
    } else if (elements.helpModal?.dataset.open === "true") {
      closeHelpModal();
    } else if (elements.statsModal?.dataset.open === "true") {
      closeStatsModal();
    } else if (elements.postGameModal?.dataset.open === "true") {
      closePostGamePanel();
    } else if (elements.archiveModal?.dataset.open === "true") {
      closeArchiveModal();
    } else if (elements.leaderboardModal?.dataset.open === "true") {
      closeLeaderboardModal();
      return;
    }
  });

  if (elements.archiveBtn) {
    elements.archiveBtn.addEventListener("click", openArchiveModal);
  }

  if (elements.closeArchiveBtn) {
    elements.closeArchiveBtn.addEventListener("click", closeArchiveModal);
  }

  if (elements.archiveGrid) {
    elements.archiveGrid.addEventListener("click", handleArchiveGridClick);
  }

  bindBackdropClose(elements.archiveModal, closeArchiveModal);

  if (elements.signInBtn) {
    elements.signInBtn.addEventListener("click", handleSignIn);
  }

  if (elements.signOutBtn) {
    elements.signOutBtn.addEventListener("click", handleSignOut);
  }

  if (elements.leaderboardBtn) {
    elements.leaderboardBtn.addEventListener("click", openLeaderboardModal);
  }

  if (elements.closeLeaderboardBtn) {
    elements.closeLeaderboardBtn.addEventListener("click", closeLeaderboardModal);
  }

  if (elements.leaderboardModal) {
    elements.leaderboardModal.addEventListener("click", (event) => {
      if (event.target === elements.leaderboardModal) {
        closeLeaderboardModal();
      }
    });
  }
}

function initGame() {
  const restored = loadProgress();

  if (!restored) {
    startPuzzle(state.mode);
    saveProgress();
  }

  renderPuzzleView();

  if (restored) {
    renderStatus("Progress restored.");
  }
}

function startPuzzle(mode = state.mode) {
  state.mode = mode;
  state.currentPuzzle = buildCurrentPuzzle(mode);
  state.guesses = [];
  state.status = "playing";

  closePostGamePanel();
  resetInput();
  resetSuggestionsState();
  closeSuggestions();
  saveProgress();
}

function resetPuzzle(mode = state.mode) {
  startPuzzle(mode);
  saveProgress();
  renderPuzzleView();
}

function init() {
  loadPreferences();
  applyAccessibilityPreferences();
  loadStats();
  initTheme();
  syncPreferenceControls();
  renderAuthUI();
  bindEvents();
  initFirebaseAuth();

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopCountdownTimer();
      return;
    }

    if (state.mode === "daily" && !isGameOver()) {
      startCountdownTimer();
    } else {
      updateCountdownLabel();
    }
  });

  initGame();
}

init();