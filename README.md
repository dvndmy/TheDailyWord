# Bibdle

Bibdle is a browser-based Bible book guessing game inspired by Wordle, built around the Catholic canon. Each puzzle shows a verse, and the player must identify the correct Bible book using feedback on testament, section, first letter, and canonical proximity.

## Features

- Daily puzzle mode with streaks, stats, and archive progress
- Practice mode with separate stats
- Easy, Normal, and Hard difficulty modes
- Autocomplete book search with keyboard support
- Light/dark theme toggle
- Accessibility settings for reduced motion, high contrast, and larger text
- Post-game panel with verse explanation, book intro, trivia, and stats
- Stats modal for historical progress and streak badges
- Archive map showing Daily solved progress across the Catholic canon
- Responsive layout for desktop and mobile

## How to Play

1. Choose Daily or Practice mode.
2. Read the verse.
3. Guess the Bible book.
4. Use the clue tiles and proximity feedback to narrow the answer.
5. Review the post-game explanation and stats when the puzzle ends.

## Canon Coverage

Bibdle uses the Catholic canon, including the Deuterocanonical books. Book order, sections, and testament groupings are normalized so clue feedback and archive progress follow Catholic Bible structure.

## Accessibility

Bibdle includes accessible modal dialogs, keyboard-friendly autocomplete, screen-reader-friendly status updates, and user-controlled visual preferences. Accessible dialogs should expose clear semantics and support keyboard dismissal, which matches the modal approach used here. [web:116][web:113]

## Tech Stack

- Semantic HTML
- CSS
- Vanilla JavaScript
- Local browser storage for progress, preferences, stats, and archive data across sessions [web:242][web:268]

## Project Structure

```text
bibdle/
├── index.html
├── css/
│   └── bibdle.css
├── js/
│   └── bibdle.js
└── data/
    ├── books.js
    └── verses.js
```

## Notes

The app is fully client-side and currently stores progress and stats locally in the browser using `localStorage`, which persists data across browser sessions for the same origin. [web:242]