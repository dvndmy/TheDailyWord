import { books } from './data/books.js';
import { verses } from './data/verses.js';

const state = {
    puzzle: null,
    guesses: [],
    selectedSuggestionIndex: -1,
    currentSuggestions: []
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

function getBook(name) {
    return books.find(book => normalizeBookName(book.name) === normalizeBookName(name));
}

function getDailyIndex() {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    const d = now.getUTCDate();
    const epoch = Date.UTC(2026, 0, 1);
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
        weekday: 'long', year: 'numeric', month: 'short', day: 'numeric'
    });
}

function hintLines() {
  const target = getBook(state.puzzle.book);
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
    const target = getBook(state.puzzle.book);
    const guess = getBook(guessName);
    if (!target || !guess) return null;
    const distance = Math.abs(target.order - guess.order);
    return {
        book: guess.name,
        testament: { value: guess.testament, state: guess.testament === target.testament ? 'correct' : 'wrong' },
        section: {
            value: guess.section,
            state: guess.section === target.section ? 'correct' : guess.testament === target.testament ? 'partial' : 'wrong'
        },
        firstLetter: {
            value: guess.firstLetter,
            state: guess.firstLetter === target.firstLetter ? 'correct' : 'wrong'
        },
        bookResult: {
            value: guess.name,
            state: guess.name === target.name ? 'correct' : distance <= 3 ? 'partial' : 'wrong'
        },
        solved: guess.name === target.name
    };
}

function renderHints() {
    elements.hintBlock.innerHTML = hintLines().map(line => `<p class="meta-line">${line}</p>`).join('');
    elements.attemptLabel.textContent = state.guesses.length === 0 ? 'Start guessing' : state.guesses.at(-1).solved ? 'You solved it' : 'Guess again';
}

function renderRows() {
    if (!state.guesses.length) {
        elements.guessRows.innerHTML = `
          <div class="guess-grid">
            <div class="empty-state">No guesses yet</div>
            <div class="empty-state">Section clue appears after each guess</div>
            <div class="empty-state">First letter narrows the answer</div>
            <div class="empty-state">Book proximity helps you triangulate</div>
          </div>`;
        return;
    }
    elements.guessRows.innerHTML = state.guesses.map(guess => `
        <div class="guess-grid" aria-label="Guess ${guess.book}">
          <div class="guess-card ${guess.testament.state}">${guess.testament.value}</div>
          <div class="guess-card ${guess.section.state}">${guess.section.value}</div>
          <div class="guess-card ${guess.firstLetter.state}">${guess.firstLetter.value}</div>
          <div class="guess-card ${guess.bookResult.state}">${guess.bookResult.value}</div>
        </div>
      `).join('');
}

function renderPuzzle() {
    elements.verseText.textContent = state.puzzle.text;
    elements.dateLabel.textContent = formatDate();
    renderHints();
    renderRows();
    elements.statusLine.textContent = 'Guess the book from the verse above.';
}

function resetPuzzle(mode = 'daily') {
    state.puzzle = pickPuzzle(mode);
    state.guesses = [];
    state.selectedSuggestionIndex = -1;
    state.currentSuggestions = [];
    elements.guessInput.value = '';
    closeSuggestions();
    renderPuzzle();
}

function closeSuggestions() {
    state.selectedSuggestionIndex = -1;
    elements.autocomplete.dataset.open = 'false';
    elements.autocomplete.innerHTML = '';
}

function updateSuggestions(query) {
    const value = query.trim().toLowerCase();
    if (!value) {
        closeSuggestions();
        return;
    }
    state.currentSuggestions = books.filter(book => book.name.toLowerCase().includes(value)).slice(0, 8);
    if (!state.currentSuggestions.length) {
        closeSuggestions();
        return;
    }
    elements.autocomplete.innerHTML = state.currentSuggestions.map((book, index) => `
        <button type="button" class="suggestion" role="option" aria-selected="${index === state.selectedSuggestionIndex}" data-index="${index}">${book.name}</button>
      `).join('');
    elements.autocomplete.dataset.open = 'true';
}

function applyGuess(rawGuess) {
    const match = books.find(book => normalizeBookName(book.name) === normalizeBookName(rawGuess));
    if (!match) {
        elements.statusLine.textContent = 'Choose a valid Catholic Bible book from the list.';
        return;
    }
    if (state.guesses.some(guess => guess.book === match.name)) {
        elements.statusLine.textContent = 'You already tried ' + match.name + '.';
        return;
    }
    const result = compareGuess(match.name);
    if (!result) return;
    state.guesses.push(result);
    elements.guessInput.value = '';
    closeSuggestions();
    renderHints();
    renderRows();
    if (result.solved) {
        elements.statusLine.textContent = `Correct — ${state.puzzle.book} (${state.puzzle.reference}).`;
    } else {
        elements.statusLine.textContent = `${match.name} added. Use the colors and clues for your next guess.`;
    }
}

async function copyResult() {
    const solved = state.guesses.some(guess => guess.solved);
    const summary = state.guesses.map(guess => {
        const tile = cell => cell.state === 'correct' ? '🟩' : cell.state === 'partial' ? '🟨' : '🟥';
        return [tile(guess.testament), tile(guess.section), tile(guess.firstLetter), tile(guess.bookResult)].join('');
    }).join('\n');
    const text = `Bibdle ${formatDate()}\n${solved ? 'Solved' : 'In progress'} in ${state.guesses.length} guess${state.guesses.length === 1 ? '' : 'es'}\n${summary}`;
    try {
        await navigator.clipboard.writeText(text);
        elements.statusLine.textContent = 'Result copied to clipboard.';
    } catch {
        elements.statusLine.textContent = 'Clipboard access is unavailable in this browser.';
    }
}

elements.guessForm.addEventListener('submit', event => {
    event.preventDefault();
    applyGuess(elements.guessInput.value);
});

elements.guessInput.addEventListener('input', event => updateSuggestions(event.target.value));
elements.guessInput.addEventListener('keydown', event => {
    if (elements.autocomplete.dataset.open !== 'true') {
        if (event.key === 'Enter') {
            event.preventDefault();
            applyGuess(elements.guessInput.value);
        }
        return;
    }
    if (event.key === 'ArrowDown') {
        event.preventDefault();
        state.selectedSuggestionIndex = (state.selectedSuggestionIndex + 1) % state.currentSuggestions.length;
        updateSuggestions(elements.guessInput.value);
    }
    if (event.key === 'ArrowUp') {
        event.preventDefault();
        state.selectedSuggestionIndex = (state.selectedSuggestionIndex - 1 + state.currentSuggestions.length) % state.currentSuggestions.length;
        updateSuggestions(elements.guessInput.value);
    }
    if (event.key === 'Enter') {
        event.preventDefault();
        const picked = state.currentSuggestions[state.selectedSuggestionIndex] || state.currentSuggestions[0];
        if (picked) applyGuess(picked.name);
    }
    if (event.key === 'Escape') closeSuggestions();
});

elements.autocomplete.addEventListener('click', event => {
    const button = event.target.closest('.suggestion');
    if (!button) return;
    const book = state.currentSuggestions[Number(button.dataset.index)];
    if (book) applyGuess(book.name);
});

document.addEventListener('click', event => {
    if (!elements.guessForm.contains(event.target)) closeSuggestions();
});

elements.helpBtn.addEventListener('click', () => {
    elements.helpModal.dataset.open = 'true';
    elements.helpModal.setAttribute('aria-hidden', 'false');
});
elements.closeHelpBtn.addEventListener('click', () => {
    elements.helpModal.dataset.open = 'false';
    elements.helpModal.setAttribute('aria-hidden', 'true');
});
elements.helpModal.addEventListener('click', event => {
    if (event.target === elements.helpModal) {
        elements.helpModal.dataset.open = 'false';
        elements.helpModal.setAttribute('aria-hidden', 'true');
    }
});
elements.shareBtn.addEventListener('click', copyResult);
elements.newPuzzleBtn.addEventListener('click', () => resetPuzzle('random'));

setThemeToggle();
resetPuzzle('daily');