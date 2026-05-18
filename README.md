# BIBDLE

Bibdle is a browser-based Bible book guessing game inspired by Wordle, focused on the Catholic canon and designed as a teaching tool as well as a puzzle.

The player is shown a Bible verse and must guess the correct book. Each guess reveals clues about the book’s testament, section, first letter, and how close it is in canonical order.

## Features

* **Daily puzzle mode** based on the current UTC date, with streak tracking and stats.
* **Practice mode** for endless random puzzles that do not affect the daily streak.
* **Difficulty modes** (Easy, Normal, Hard) that adjust guess limits and hint behavior.
* **Autocomplete suggestions** while typing book names, with keyboard and screen-reader support.
* **Feedback tiles** for:
  * Testament
  * Section
  * First letter
  * Canonical proximity and exact book match
* **Textual proximity feedback** (exact, very close, near, far, wrong testament) under the grid.
* **Light/dark theme toggle** that respects system preferences and remembers your choice.
* **Post-game panel** showing the correct book, reference, full verse, explanation, and book intro.
* **Share result button** that copies a summary of your game to the clipboard.
* **Help modal** with instructions and accessibility-friendly status messages.
* **Responsive layout** for mobile and desktop, including a mobile-friendly control layout.

## How to Play

1. Choose Daily or Practice mode and (optionally) select a difficulty.
2. Read the verse shown on screen.
3. Type the Bible book you think it comes from, or pick from the suggestions list.
4. Use the feedback tiles and proximity text to narrow down the answer.
5. Keep guessing until you find the correct book or run out of guesses (depending on difficulty).
6. After the puzzle ends, review the explanation and book intro in the post-game panel.

## Supported Books

The game includes books from the Catholic canon:
* Genesis through Revelation.
* Deuterocanonical books such as Tobit, Judith, Wisdom, Sirach, Baruch, 1 Maccabees, and 2 Maccabees.
* Book ordering, sections, and testaments are normalized so proximity feedback reflects the Catholic Bible’s structure.

## Technical Details

Built as a small multi-file web app with semantic HTML, CSS, and vanilla JavaScript.

Uses separate modules for:
* Core UI and game logic (`js/bibdle.js`)
* Book metadata (`data/books.js`)
* Verse pool and educational content (`data/verses.js`)

Central `CONFIG` object controls modes, guess limits, proximity bands, and storage keys.

Uses `localStorage` to persist:
* Current puzzle progress
* Theme and mode preferences
* Game stats and daily streaks

Uses Google Fonts for typography.
Includes keyboard- and screen-reader-friendly autocomplete and status messages via ARIA attributes.

## File Structure

bibdle/
├── Bibdle.html        # Main HTML shell
├── css/
│   └── bibdle.css     # Styles for layout, themes, and animations
├── js/
│   └── bibdle.js      # Game logic, state management, rendering, persistence
└── data/
    ├── books.js       # Catholic canon metadata (order, testament, sections, intros)
    └── verses.js      # Verse pool with references, difficulty, explanations