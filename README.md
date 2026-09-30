<<<<<<< HEAD
# My Todos — simple todo list web app

A small, dependency-free todo list that runs entirely in the browser. No build step, no
package manager, no server required.

## Run it

Open `index.html` in any modern browser (double-click it, or right-click → *Open with* → your browser).

Optional: serve the folder locally if you prefer a real origin (needed only if you want the
`localStorage` write to be tied to `http://localhost` instead of `file://`):

```powershell
# from this folder, using Python (if installed)
python -m http.server 5500
# then open http://localhost:5500
```

```powershell
# or using Node (if installed)
npx --yes serve .
```

## Features

| Feature | How |
| --- | --- |
| Add a task | Type in the input and press **Enter** / **Add task** |
| Complete a task | Click the round checkbox |
| Rename a task | Double-click the text, or press the pencil button. **Enter** saves, **Escape** cancels, clicking away also saves |
| Delete a task | Press the trash button |
| Filter | **All** / **Active** / **Done** |
| Clear finished work | **Clear done** (disabled when nothing is completed) |
| Progress | "N tasks left" / "All done - N tasks completed" |
| Dark mode | Moon/sun button, remembers your choice; otherwise follows your OS setting |
| Persistence | Everything is stored in `localStorage` under `my-todos:v1` — reload and your list is intact |

### Details worth knowing

- Blank input is rejected with an inline message; duplicate *active* task text is also rejected.
- Task length is capped at 200 characters, and internal whitespace is collapsed (so pasted
  multi-line text becomes one clean line).
- Task text is rendered with `textContent`, so pasted HTML/script is displayed as plain text
  (no XSS).
- All icons are inline SVG (no icon fonts or emoji), so nothing depends on the fonts installed on
  your machine. The sun/moon artwork is swapped by CSS from the `data-theme` attribute.
- Fully keyboard operable, with a skip link, `aria-label`s on every control, `aria-pressed`
  filter state, and a polite live region that announces add/rename/complete/delete.
- Honors `prefers-reduced-motion` and narrow phone widths.

## Files

```
index.html   markup + <template> used to build each task row
styles.css   light/dark theme variables, layout, responsive rules
app.js       state, localStorage persistence, rendering, events (IIFE, no globals)
```

### Data shape

```js
{ id: "uuid", text: "Buy milk", done: false, createdAt: 1710000000000 }
```

## Verification

Before hand-off the app was exercised end-to-end in headless Chrome (84 assertions, all passing)
covering: startup/empty state, adding tasks, duplicate and blank-input rejection, pasted-HTML
safety, complete/uncomplete, all three filters, rename (Enter, click-away, Escape, blank), delete,
clear done, the all-done summary, theme toggling with persistence, the stored data shape, and a
second page load against the same browser profile to prove `localStorage` restores the list.
`app.js` was also parse-checked for syntax errors, and light/dark screenshots were reviewed.

## Reset

Clear the list with **Clear done**, or wipe everything by running this in the browser console:

```js
localStorage.removeItem("my-todos:v1"); location.reload();
```

## Browser support

Modern evergreen browsers (Chrome, Edge, Firefox, Safari). Uses `matchMedia`, `Element.closest`,
`<template>`, and `color-mix()` (the tint on completed rows simply falls back to the normal row
background on older engines).