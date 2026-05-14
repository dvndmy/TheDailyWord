import { books } from "./data/books.js";
import { verses } from "./data/verses.js";

const CONFIG = {
  modes: {
    normal: { maxGuesses: 6, progressiveHints: true },
    easy: { maxGuesses: 8, progressiveHints: true },
    hard: { maxGuesses: 5, progressiveHints: false },
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

const state = {
  mode: "daily",
  currentPuzzle: null,
  guesses: [],
  status: "playing",
  selectedSuggestionIndex: -1,
  currentSuggestions: [],
  postGameOpen: false,
  preferences: {
    theme: "dark",
    difficulty: "normal",
    preferredMode: "daily",
    sound: false,
    reducedAnimation: false,
  },
  stats: {
    played: 0,
    won: 0,
    lost: 0,
    currentStreak: 0,
    bestStreak: 0,
    guessDistribution: {},
    lastDailySolvedDate: null,
  },
};

const elements = {
  verseText: document.getElementById("verseText"),
  dateLabel: document.getElementById("dateLabel"),
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
  helpModal: document.getElementById("helpModal"),
  closeHelpBtn: document.getElementById("closeHelpBtn"),
  difficultySelect: document.getElementById("difficultySelect"),
  modeSelect: document.getElementById("modeSelect"),
  themeToggle: document.querySelector("[data-theme-toggle]"),
  postGameModal: document.getElementById("postGameModal"),
  postGameTitle: document.getElementById("postGameTitle"),
  postGameBadge: document.getElementById("postGameBadge"),
  postGameReference: document.getElementById("postGameReference"),
  postGameBook: document.getElementById("postGameBook"),
  postGameVerse: document.getElementById("postGameVerse"),
  postGameExplanation: document.getElementById("postGameExplanation"),
  postGameIntroTitle: document.getElementById("postGameIntroTitle"),
  postGameIntroText: document.getElementById("postGameIntroText"),
  postGameCloseBtn: document.getElementById("postGameCloseBtn"),
  postGameNextBtn: document.getElementById("postGameNextBtn"),
};

function getSystemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function normalizeBookName(value) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getBookByName(name) {
  const normalized = normalizeBookName(name);
  return books.find((book) => book.normalizedName === normalized);
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
    "wrong testament": `${guess.book} is in the wrong testament, so the target is on the other side of the Bible.`,
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
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();
  const epoch = Date.UTC(
    CONFIG.daily.epochYear,
    CONFIG.daily.epochMonth,
    CONFIG.daily.epochDay,
  );
  const current = Date.UTC(y, m, d);
  return (
    ((Math.floor((current - epoch) / 86400000) % verses.length) +
      verses.length) %
    verses.length
  );
}

function pickPuzzle(mode = "daily") {
  if (mode === "practice")
    return verses[Math.floor(Math.random() * verses.length)];
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

function clearSavedProgress() {
  try {
    localStorage.removeItem(CONFIG.storageKeys.progress);
  } catch {}
}

function saveProgress() {
  if (!state.currentPuzzle) return;
  if (state.mode !== "daily") {
    clearSavedProgress();
    return;
  }
  const payload = {
    mode: state.mode,
    currentPuzzle: {
      id: state.currentPuzzle.id,
      date: state.currentPuzzle.date,
      mode: state.currentPuzzle.mode,
    },
    guesses: state.guesses,
    status: state.status,
  };
  try {
    localStorage.setItem(CONFIG.storageKeys.progress, JSON.stringify(payload));
  } catch {}
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
    const todayPuzzle = pickPuzzle("daily");
    const todayDate = getTodayPuzzleDate();
    const isMatchingDailyPuzzle =
      saved.currentPuzzle.mode === "daily" &&
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
    state.guesses = Array.isArray(saved.guesses) ? saved.guesses : [];
    state.status = ["playing", "won", "lost"].includes(saved.status)
      ? saved.status
      : "playing";
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
  };
  try {
    localStorage.setItem(
      CONFIG.storageKeys.preferences,
      JSON.stringify(payload),
    );
  } catch {}
}

function loadPreferences() {
  const defaults = {
    theme: getSystemTheme(),
    difficulty: "normal",
    preferredMode: "daily",
    sound: false,
    reducedAnimation: false,
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
    };
  } catch {
    state.preferences = defaults;
  }
  state.mode = state.preferences.preferredMode;
}

function saveStats() {
  const payload = {
    played: state.stats.played,
    won: state.stats.won,
    lost: state.stats.lost,
    currentStreak: state.stats.currentStreak,
    bestStreak: state.stats.bestStreak,
    guessDistribution: state.stats.guessDistribution,
    lastDailySolvedDate: state.stats.lastDailySolvedDate,
  };
  try {
    localStorage.setItem(CONFIG.storageKeys.stats, JSON.stringify(payload));
  } catch {}
}

function loadStats() {
  const defaults = {
    played: 0,
    won: 0,
    lost: 0,
    currentStreak: 0,
    bestStreak: 0,
    guessDistribution: {},
    lastDailySolvedDate: null,
  };
  try {
    const raw = localStorage.getItem(CONFIG.storageKeys.stats);
    if (!raw) {
      state.stats = defaults;
      return;
    }
    const saved = JSON.parse(raw);
    state.stats = {
      played:
        Number.isInteger(saved?.played) && saved.played >= 0
          ? saved.played
          : defaults.played,
      won:
        Number.isInteger(saved?.won) && saved.won >= 0
          ? saved.won
          : defaults.won,
      lost:
        Number.isInteger(saved?.lost) && saved.lost >= 0
          ? saved.lost
          : defaults.lost,
      currentStreak:
        Number.isInteger(saved?.currentStreak) && saved.currentStreak >= 0
          ? saved.currentStreak
          : defaults.currentStreak,
      bestStreak:
        Number.isInteger(saved?.bestStreak) && saved.bestStreak >= 0
          ? saved.bestStreak
          : defaults.bestStreak,
      guessDistribution:
        saved?.guessDistribution &&
        typeof saved.guessDistribution === "object" &&
        !Array.isArray(saved.guessDistribution)
          ? saved.guessDistribution
          : defaults.guessDistribution,
      lastDailySolvedDate:
        typeof saved?.lastDailySolvedDate === "string" ||
        saved?.lastDailySolvedDate === null
          ? saved.lastDailySolvedDate
          : defaults.lastDailySolvedDate,
    };
  } catch {
    state.stats = defaults;
  }
}

function hasRecordedDailyResult(date) {
  return state.stats.lastDailySolvedDate === date;
}

function recordPuzzleCompletion(outcome) {
  if (!state.currentPuzzle || state.currentPuzzle.mode !== "daily") return;
  const completionDate = state.currentPuzzle.date;
  if (completionDate && hasRecordedDailyResult(completionDate)) return;
  state.stats.played += 1;
  if (outcome === "won") {
    state.stats.won += 1;
    const guessCount = state.guesses.length;
    state.stats.guessDistribution[guessCount] =
      (state.stats.guessDistribution[guessCount] ?? 0) + 1;
    if (completionDate) {
      const previousDate = getPreviousDate(completionDate);
      state.stats.currentStreak =
        state.stats.lastDailySolvedDate === previousDate
          ? state.stats.currentStreak + 1
          : 1;
      state.stats.bestStreak = Math.max(
        state.stats.bestStreak,
        state.stats.currentStreak,
      );
      state.stats.lastDailySolvedDate = completionDate;
    }
  } else if (outcome === "lost") {
    state.stats.lost += 1;
    if (completionDate) {
      state.stats.currentStreak = 0;
      state.stats.lastDailySolvedDate = completionDate;
    }
  }
  saveStats();
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
    "Switch to " +
      (state.preferences.theme === "dark" ? "light" : "dark") +
      " mode",
  );
}

function canChangeDifficulty() {
  return state.guesses.length === 0 && state.status === "playing";
}

function syncPreferenceControls() {
  if (elements.difficultySelect) {
    elements.difficultySelect.value = state.preferences.difficulty;
    elements.difficultySelect.disabled = !canChangeDifficulty();
    elements.difficultySelect.setAttribute(
      "aria-disabled",
      String(!canChangeDifficulty()),
    );
    elements.difficultySelect.title = canChangeDifficulty()
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
  if (!elements.nextPracticeBtn) return;
  const showNextPractice = state.mode === "practice" && isGameOver();
  elements.nextPracticeBtn.hidden = !showNextPractice;
}

function initTheme() {
  applyTheme(state.preferences.theme);
  renderThemeToggle();
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
    CONFIG.modes[state.preferences.difficulty]?.maxGuesses ??
    CONFIG.modes.normal.maxGuesses
  );
}

function isGameOver() {
  return state.status === "won" || state.status === "lost";
}

function getHintLines() {
  const target = getBookByName(state.currentPuzzle?.verse.book);
  if (!target) return [];
  if (state.guesses.length === 0)
    return ["The first letter is hidden until later guesses."];
  if (state.guesses.length === 1) {
    return [
      "It is in the " + target.testament + " Testament.",
      "Its first letter is hidden until later guesses.",
    ];
  }
  if (state.guesses.length <= 3) {
    return [
      "It is in the " + target.testament + " Testament.",
      "It is in the " + target.section + " section.",
    ];
  }
  if (state.guesses.length <= 5) {
    return [
      "It is in the " + target.testament + " Testament.",
      "It is in the " + target.section + " section.",
      "Its first letter is " + target.firstLetter + ".",
    ];
  }
  return [
    "It is in the " + target.testament + " Testament.",
    "It is in the " + target.section + " section.",
    "Its first letter is " + target.firstLetter + ".",
    "Reference: " + state.currentPuzzle.verse.reference + ".",
  ];
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

function renderPuzzleCard() {
  elements.verseText.textContent = state.currentPuzzle?.verse.text ?? "";
  elements.dateLabel.textContent =
    state.mode === "daily"
      ? `Daily puzzle · ${formatDate()}`
      : "Practice puzzle";
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
  const baseDelay = animate ? rowIndex * 2000 : 0;
  return `
    <div class="guess-grid" aria-label="Guess ${guess.book}">
      <div class="guess-card ${guess.testament.state}${animate ? " reveal-animate" : ""}" style="--reveal-delay: ${baseDelay + 0}ms">${guess.testament.value}</div>
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
  const lastIndex = state.guesses.length - 1;
  elements.guessRows.innerHTML = state.guesses
    .map((guess, index) =>
      renderGuessRow(guess, index, animateLatest && index === lastIndex),
    )
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

function getPostGameContent() {
  const puzzle = state.currentPuzzle?.verse;
  if (!puzzle) return null;
  const book = getBookByName(puzzle.book);
  return {
    title: state.status === "won" ? "Well done" : "Puzzle complete",
    badge: state.status === "won" ? "Solved" : "Failed",
    reference: puzzle.reference,
    bookName: puzzle.book,
    verseText: puzzle.text,
    explanation: puzzle.explanation ?? "",
    introTitle: book?.bookIntroTitle ?? "",
    introText: book?.bookIntroText ?? "",
    devotionalText: puzzle.devotional ?? book?.devotionalText ?? "",
  };
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
  elements.postGameExplanation.textContent =
    content.explanation || "No explanation available for this verse.";
  elements.postGameIntroTitle.textContent = content.introTitle;
  elements.postGameIntroText.textContent = content.introText;
  elements.postGameNextBtn.hidden = !(state.mode === "practice");
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
  renderStatus("You already tried " + bookName + ".");
}

function handleSolvedGuess() {
  state.status = "won";
  recordPuzzleCompletion("won");
  renderHintBlock();
  renderGuessRows(true);
  renderProximityLine();
  syncPreferenceControls();
  syncActionButtons();
  renderStatus(
    `Correct — ${state.currentPuzzle.verse.book} (${state.currentPuzzle.verse.reference}).`,
  );
  saveProgress();
  renderPuzzleView();
}

function handleLostGuess() {
  state.status = "lost";
  recordPuzzleCompletion("lost");
  renderHintBlock();
  renderGuessRows(true);
  renderProximityLine();
  syncPreferenceControls();
  syncActionButtons();
  renderStatus(
    `Out of guesses — the answer was ${state.currentPuzzle.verse.book} (${state.currentPuzzle.verse.reference}).`,
  );
  saveProgress();
  renderPuzzleView();
}

function handleIncorrectGuess(bookName) {
  renderHintBlock();
  renderGuessRows(true);
  renderProximityLine();
  syncPreferenceControls();
  syncActionButtons();
  renderStatus(
    `${bookName} added. Use the colors and clues for your next guess.`,
  );
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

function openHelpModal() {
  elements.helpModal.dataset.open = "true";
  elements.helpModal.setAttribute("aria-hidden", "false");
}

function closeHelpModal() {
  elements.helpModal.dataset.open = "false";
  elements.helpModal.setAttribute("aria-hidden", "true");
}

function handleGuessSubmit(event) {
  event.preventDefault();
  applyGuess(elements.guessInput.value);
}

function handleGuessInput(event) {
  if (isGameOver()) return;
  updateSuggestions(event.target.value);
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

  if (event.key === "Enter") {
    if (state.selectedSuggestionIndex >= 0) {
      event.preventDefault();
      const picked = state.currentSuggestions[state.selectedSuggestionIndex];
      if (picked) applyGuess(picked.name);
    }
    return;
  }
}

function handleSuggestionClick(event) {
  const button = event.target.closest(".suggestion");
  if (!button) return;
  const book = state.currentSuggestions[Number(button.dataset.index)];
  if (book) applyGuess(book.name);
}

function handleDocumentClick(event) {
  if (!elements.guessForm.contains(event.target)) closeSuggestions();
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

function bindEvents() {
  elements.guessForm.addEventListener("submit", handleGuessSubmit);
  elements.guessInput.addEventListener("input", handleGuessInput);
  elements.guessInput.addEventListener("keydown", handleGuessKeydown);
  elements.autocomplete.addEventListener("click", handleSuggestionClick);
  document.addEventListener("click", handleDocumentClick);
  elements.helpBtn.addEventListener("click", openHelpModal);
  elements.closeHelpBtn.addEventListener("click", closeHelpModal);
  elements.helpModal.addEventListener("click", (event) => {
    if (event.target === elements.helpModal) closeHelpModal();
  });
  elements.shareBtn.addEventListener("click", copyResult);
  if (elements.nextPracticeBtn)
    elements.nextPracticeBtn.addEventListener(
      "click",
      handleNextPracticePuzzle,
    );
  if (elements.postGameCloseBtn)
    elements.postGameCloseBtn.addEventListener("click", closePostGamePanel);
  if (elements.postGameNextBtn)
    elements.postGameNextBtn.addEventListener(
      "click",
      handleNextPracticePuzzle,
    );
  if (elements.postGameModal) {
    elements.postGameModal.addEventListener("click", (event) => {
      if (event.target === elements.postGameModal) closePostGamePanel();
    });
  }
  if (elements.themeToggle)
    elements.themeToggle.addEventListener("click", handleThemeToggle);
  if (elements.difficultySelect)
    elements.difficultySelect.addEventListener(
      "change",
      handleDifficultyChange,
    );
  if (elements.modeSelect)
    elements.modeSelect.addEventListener("change", handleModeChange);
}

function initGame() {
  const restored = loadProgress();
  if (!restored) {
    startPuzzle(state.mode);
    saveProgress();
  }
  renderPuzzleView();
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
}

function resetPuzzle(mode = state.mode) {
  startPuzzle(mode);
  saveProgress();
  renderPuzzleView();
}

function init() {
  loadPreferences();
  loadStats();
  initTheme();
  syncPreferenceControls();
  bindEvents();
  initGame();
}

init();
