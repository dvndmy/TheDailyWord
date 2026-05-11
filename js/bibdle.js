import { books } from './data/books.js';
import { verses } from './data/verses.js';

const CONFIG = {
    modes: {
        normal: { maxGuesses: 6, progressiveHints: true },
        easy: { maxGuesses: 8, progressiveHints: true },
        hard: { maxGuesses: 5, progressiveHints: false }
    },
    proximityBands: {
        exact: 0,
        almost: 2,
        close: 4
    },
    ui: {
        maxSuggestions: 8
    },
    daily: {
        epochYear: 2026,
        epochMonth: 0,
        epochDay: 1
    },
    storageKeys: {
        progress: 'bibdle-progress',
        preferences: 'bibdle-preferences',
        stats: 'bibdle-stats'
    }
};

const state = {
    puzzle: null,
    guesses: [],
    selectedSuggestionIndex: -1,
    currentSuggestions: [],
    mode: 'normal'
};

const elements = {
    verseText: document.getElementById('verseText'),
    dateLabel: document.getElementById('dateLabel'),
    attemptLabel: document.getElementById('attemptLabel'),
    hintBlock: document.getElementById('hintBlock'),
    guessForm: document.getElementById('guessForm'),
    guessInput: document.getElementById('guessInput'),
    autocomplete: document.getElementById('autocomplete'),
    guessRows: document.getElementById('guessRows'),
    statusLine: document.getElementById('statusLine'),
    helpBtn: document.getElementById('helpBtn'),
    shareBtn: document.getElementById('shareBtn'),
    newPuzzleBtn: document.getElementById('newPuzzleBtn'),
    helpModal: document.getElementById('helpModal'),
    closeHelpBtn: document.getElementById('closeHelpBtn')
};

function setThemeToggle() {
    const toggle = document.querySelector('[data-theme-toggle]');
    if (!toggle) return;

    const root = document.documentElement;
    let theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    root.setAttribute('data-theme', theme);

    const renderIcon = () => {
        toggle.innerHTML = theme === 'dark'
            ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="5"></circle><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path></svg>'
            : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';

        toggle.setAttribute('aria-label', 'Switch to ' + (theme === 'dark' ? 'light' : 'dark') + ' mode');
    };

    renderIcon();

    toggle.addEventListener('click', () => {
        theme = theme === 'dark' ? 'light' : 'dark';
        root.setAttribute('data-theme', theme);
        renderIcon();
    });
}

function normalizeBookName(value) {
    return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function getBookByName(name) {
    const normalized = normalizeBookName(name);
    return books.find(book => book.normalizedName === normalized);
}

function getBookDistance(a, b) {
    const bookA = typeof a === 'string' ? getBookByName(a) : a;
    const bookB = typeof b === 'string' ? getBookByName(b) : b;

    if (!bookA || !bookB) return null;

    return Math.abs(bookA.order - bookB.order);
}

function isSameSection(a, b) {
  const bookA = typeof a === 'string' ? getBookByName(a) : a;
  const bookB = typeof b === 'string' ? getBookByName(b) : b;

  if (!bookA || !bookB) return false;

  return bookA.sectionKey === bookB.sectionKey;
}

function getProximityLabel(distance) {
    if (distance === null) return 'unknown';
    if (distance <= CONFIG.proximityBands.exact) return 'exact';
    if (distance <= CONFIG.proximityBands.almost) return 'almost';
    if (distance <= CONFIG.proximityBands.close) return 'close';
    return 'far';
}

function getDailyIndex() {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    const d = now.getUTCDate();

    const epoch = Date.UTC(
        CONFIG.daily.epochYear,
        CONFIG.daily.epochMonth,
        CONFIG.daily.epochDay
    );

    const current = Date.UTC(y, m, d);
    return Math.floor((current - epoch) / 86400000) % verses.length;
}

function pickPuzzle(mode = 'daily') {
    if (mode === 'random') {
        return verses[Math.floor(Math.random() * verses.length)];
    }

    return verses[((getDailyIndex() % verses.length) + verses.length) % verses.length];
}

function formatDate() {
    return new Date().toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function getHintLines() {
    const target = getBookByName(state.puzzle.book);
    if (!target) return [];

    if (state.guesses.length === 0) {
        return ['The first letter is hidden until later guesses.'];
    }

    if (state.guesses.length === 1) {
        return [
            'It is in the ' + target.testament + ' Testament.',
            'Its first letter is hidden until later guesses.'
        ];
    }

    if (state.guesses.length <= 3) {
        return [
            'It is in the ' + target.testament + ' Testament.',
            'It is in the ' + target.section + ' section.'
        ];
    }

    if (state.guesses.length <= 5) {
        return [
            'It is in the ' + target.testament + ' Testament.',
            'It is in the ' + target.section + ' section.',
            'Its first letter is ' + target.firstLetter + '.'
        ];
    }

    return [
        'It is in the ' + target.testament + ' Testament.',
        'It is in the ' + target.section + ' section.',
        'Its first letter is ' + target.firstLetter + '.',
        'Reference: ' + state.puzzle.reference + '.'
    ];
}

function compareGuess(guessName) {
    const target = getBookByName(state.puzzle.book);
    const guess = getBookByName(guessName);

    if (!target || !guess) return null;

    const distance = getBookDistance(target, guess);
    const proximity = getProximityLabel(distance);

    return {
        book: guess.name,
        distance,
        proximity,
        testament: {
            value: guess.testament,
            state: guess.testament === target.testament ? 'correct' : 'wrong'
        },
        section: {
            value: guess.section,
            state: isSameSection(guess, target)
                ? 'correct'
                : guess.testament === target.testament
                    ? 'partial'
                    : 'wrong'
        },
        firstLetter: {
            value: guess.firstLetter,
            state: guess.firstLetter === target.firstLetter ? 'correct' : 'wrong'
        },
        bookResult: {
            value: guess.name,
            state: proximity === 'exact'
                ? 'correct'
                : proximity === 'almost' || proximity === 'close'
                    ? 'partial'
                    : 'wrong'
        },
        solved: guess.name === target.name
    };
}

function getAttemptLabel() {
    if (state.guesses.length === 0) return 'Start guessing';
    if (state.guesses.at(-1).solved) return 'You solved it';
    return 'Guess again';
}

function renderPuzzleCard() {
    elements.verseText.textContent = state.puzzle?.text ?? '';
    elements.dateLabel.textContent = formatDate();
}

function renderHintBlock() {
    const lines = getHintLines();
    elements.hintBlock.innerHTML = lines
        .map(line => `<p class="meta-line">${line}</p>`)
        .join('');
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

function renderGuessRow(guess) {
    return `
    <div class="guess-grid" aria-label="Guess ${guess.book}">
      <div class="guess-card ${guess.testament.state}">${guess.testament.value}</div>
      <div class="guess-card ${guess.section.state}">${guess.section.value}</div>
      <div class="guess-card ${guess.firstLetter.state}">${guess.firstLetter.value}</div>
      <div class="guess-card ${guess.bookResult.state}">${guess.bookResult.value}</div>
    </div>
  `;
}

function renderGuessRows() {
    if (!state.guesses.length) {
        renderEmptyGuessRows();
        return;
    }

    elements.guessRows.innerHTML = state.guesses.map(renderGuessRow).join('');
}

function renderStatus(message = 'Guess the book from the verse above.') {
    elements.statusLine.textContent = message;
}

function renderPuzzleView() {
    renderPuzzleCard();
    renderHintBlock();
    renderGuessRows();
    renderStatus();
}

function resetInput() {
    elements.guessInput.value = '';
}

function resetSuggestionsState() {
    state.selectedSuggestionIndex = -1;
    state.currentSuggestions = [];
}

function closeSuggestions() {
    state.selectedSuggestionIndex = -1;
    elements.autocomplete.dataset.open = 'false';
    elements.autocomplete.innerHTML = '';
}

function resetPuzzle(mode = 'daily') {
    state.puzzle = pickPuzzle(mode);
    state.guesses = [];
    resetInput();
    resetSuggestionsState();
    closeSuggestions();
    renderPuzzleView();
}

function renderSuggestions() {
    if (!state.currentSuggestions.length) {
        closeSuggestions();
        return;
    }

    elements.autocomplete.innerHTML = state.currentSuggestions.map((book, index) => `
    <button
      type="button"
      class="suggestion"
      role="option"
      aria-selected="${index === state.selectedSuggestionIndex}"
      data-index="${index}">
      ${book.name}
    </button>
  `).join('');

    elements.autocomplete.dataset.open = 'true';
}

function updateSuggestions(query) {
    const value = query.trim().toLowerCase();

    if (!value) {
        resetSuggestionsState();
        closeSuggestions();
        return;
    }

    state.currentSuggestions = books
        .filter(book => book.name.toLowerCase().includes(value))
        .slice(0, CONFIG.ui.maxSuggestions);

    renderSuggestions();
}

function handleInvalidGuess() {
    renderStatus('Choose a valid Catholic Bible book from the list.');
}

function handleDuplicateGuess(bookName) {
    renderStatus('You already tried ' + bookName + '.');
}

function handleSolvedGuess() {
    renderHintBlock();
    renderGuessRows();
    renderStatus(`Correct — ${state.puzzle.book} (${state.puzzle.reference}).`);
}

function handleIncorrectGuess(bookName, proximity) {
    const proximityText = {
        almost: ' Your guess is almost the target in canon order.',
        close: ' Your guess is fairly close in canon order.',
        far: '',
        unknown: ''
    };

    renderHintBlock();
    renderGuessRows();
    renderStatus(`${bookName} added. Use the colors and clues for your next guess.${proximityText[proximity] ?? ''}`);
}

function applyGuess(rawGuess) {
    const match = getBookByName(rawGuess);

    if (!match) {
        handleInvalidGuess();
        return;
    }

    if (state.guesses.some(guess => guess.book === match.name)) {
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

    handleIncorrectGuess(match.name, result.proximity);
}

function buildShareSummary() {
    return state.guesses.map(guess => {
        const tile = cell => cell.state === 'correct' ? '🟩' : cell.state === 'partial' ? '🟨' : '🟥';
        return [
            tile(guess.testament),
            tile(guess.section),
            tile(guess.firstLetter),
            tile(guess.bookResult)
        ].join('');
    }).join('\n');
}

function buildShareText() {
    const solved = state.guesses.some(guess => guess.solved);
    const guessWord = state.guesses.length === 1 ? 'guess' : 'guesses';

    return `Bibdle ${formatDate()}\n${solved ? 'Solved' : 'In progress'} in ${state.guesses.length} ${guessWord}\n${buildShareSummary()}`;
}

async function copyResult() {
    try {
        await navigator.clipboard.writeText(buildShareText());
        renderStatus('Result copied to clipboard.');
    } catch {
        renderStatus('Clipboard access is unavailable in this browser.');
    }
}

function openHelpModal() {
    elements.helpModal.dataset.open = 'true';
    elements.helpModal.setAttribute('aria-hidden', 'false');
}

function closeHelpModal() {
    elements.helpModal.dataset.open = 'false';
    elements.helpModal.setAttribute('aria-hidden', 'true');
}

function handleGuessSubmit(event) {
    event.preventDefault();
    applyGuess(elements.guessInput.value);
}

function handleGuessInput(event) {
    updateSuggestions(event.target.value);
}

function handleGuessKeydown(event) {
    if (elements.autocomplete.dataset.open !== 'true') {
        if (event.key === 'Enter') {
            event.preventDefault();
            applyGuess(elements.guessInput.value);
        }
        return;
    }

    if (event.key === 'ArrowDown') {
        event.preventDefault();
        state.selectedSuggestionIndex =
            (state.selectedSuggestionIndex + 1) % state.currentSuggestions.length;
        renderSuggestions();
    }

    if (event.key === 'ArrowUp') {
        event.preventDefault();
        state.selectedSuggestionIndex =
            (state.selectedSuggestionIndex - 1 + state.currentSuggestions.length) % state.currentSuggestions.length;
        renderSuggestions();
    }

    if (event.key === 'Enter') {
        event.preventDefault();
        const picked = state.currentSuggestions[state.selectedSuggestionIndex] || state.currentSuggestions[0];
        if (picked) applyGuess(picked.name);
    }

    if (event.key === 'Escape') {
        closeSuggestions();
    }
}

function handleSuggestionClick(event) {
    const button = event.target.closest('.suggestion');
    if (!button) return;

    const book = state.currentSuggestions[Number(button.dataset.index)];
    if (book) applyGuess(book.name);
}

function handleDocumentClick(event) {
    if (!elements.guessForm.contains(event.target)) {
        closeSuggestions();
    }
}

function bindEvents() {
    elements.guessForm.addEventListener('submit', handleGuessSubmit);
    elements.guessInput.addEventListener('input', handleGuessInput);
    elements.guessInput.addEventListener('keydown', handleGuessKeydown);
    elements.autocomplete.addEventListener('click', handleSuggestionClick);
    document.addEventListener('click', handleDocumentClick);

    elements.helpBtn.addEventListener('click', openHelpModal);
    elements.closeHelpBtn.addEventListener('click', closeHelpModal);
    elements.helpModal.addEventListener('click', event => {
        if (event.target === elements.helpModal) {
            closeHelpModal();
        }
    });

    elements.shareBtn.addEventListener('click', copyResult);
    elements.newPuzzleBtn.addEventListener('click', () => resetPuzzle('random'));
}

function init() {
    setThemeToggle();
    bindEvents();
    resetPuzzle('daily');
}

init();