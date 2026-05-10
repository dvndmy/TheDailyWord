# BIBDLE

Bibdle is a single-file, browser-based Bible book guessing game inspired by Wordle.

The player is shown a Bible verse and must guess the correct book. Each guess reveals clues about the book’s testament, section, first letter, and closeness in canonical order.

## Features

- Daily puzzle mode based on the current UTC date.
- Random puzzle mode for unlimited practice.
- Autocomplete suggestions while typing book names.
- Feedback tiles for:
  - Testament.
  - Section.
  - First letter.
  - Exact book match.
- Light/dark theme toggle.
- Share result button.
- Help modal with instructions.
- Responsive layout for mobile and desktop.

## How to play

1. Read the verse shown on screen.
2. Type the Bible book you think it comes from.
3. Use the feedback tiles to narrow down the answer.
4. Keep guessing until the correct book is found.

## Supported books

The game includes books from the Catholic canon:

- Genesis through Revelation.
- Deuterocanonical books such as Tobit, Judith, Wisdom, Sirach, Baruch, 1 Maccabees, and 2 Maccabees.

## Technical details

- Built as a single HTML file.
- Uses vanilla JavaScript.
- Uses Google Fonts for typography.
- Stores theme preference in memory only, not in localStorage.
- Fully self-contained with embedded CSS and JS.

## File structure

```text
bibdle/
└── bibdle.html
```

## Running locally

1. Save the HTML file as `bibdle.html`.
2. Open it in any modern browser.
3. Play immediately — no build step required.

## Notes

- The verse list includes many Catholic Bible passages.
- Daily puzzle selection is based on UTC date.
- Random mode uses a fresh verse each time.

## License

Add a license here if you plan to share or publish the project.
