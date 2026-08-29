# Imposter

A small single-page web implementation of the *Imposter* party game, inspired by [fakeitgame.com](https://fakeitgame.com/).

No build step, no dependencies, no server. Just open `index.html` in any modern browser.

## How to run

1. Double-click `index.html` (or right-click → Open With → your browser).
2. Set up your game, pass the phone around, have fun.

That's it — everything runs locally in the browser.

## Files

| File         | Purpose                                                                 |
| ------------ | ----------------------------------------------------------------------- |
| `index.html` | All screens and DOM structure.                                          |
| `styles.css` | Single stylesheet, dark theme with purple accent.                       |
| `app.js`     | Vanilla JS state machine driving all screens.                           |
| `words.js`   | Word lists per category (currently unused — reveal shows `Hello`).      |

## Flow

1. **Settings** — number of players, number of imposters, round time
2. **Players** — enter each player's name
3. **Category** — pick one of 8 kids-friendly categories
4. **Reveal** — each player privately reveals their word
5. **Hype** — a random player's name is shown for 5 seconds
6. **Timer** — countdown for the configured round time
7. **Vote** — select exactly N players (where N = number of imposters)
8. **Result** — players win or imposters win, based on the vote

Use **Play again** to return to the category screen, or **Quit** to close the tab.

## Categories

8 categories, 50 words each, all curated to be kids-friendly:

- 🍕 **Food** — meals, fruits, snacks, desserts, drinks, breakfast
- ⚽ **Sports** — mainstream sports + kid-accessible playground games
- 🐶 **Animals** — pets, farm, wild mammals, sea creatures, bugs
- 🎬 **Movies** — animated classics, Pixar, superheroes, family favorites
- 🏰 **Disney** — princesses, classic heroes, Pixar characters, villains
- 📚 **School** — classroom objects, subjects, school life, supplies
- 🧸 **Toys** — classic toys, board games, video games, outdoor play
- 🌳 **Nature** — weather, landscapes, water, plants, sky

Add or edit categories by editing `words.js` — each key in the
`window.WORDS` object is a category, and the value is an array of words.
The category buttons in `index.html` reference these keys via their
`data-category` attribute.

## Run as a PWA on your phone

The game is a Progressive Web App — it can be installed to your home
screen and used **offline**, with no browser address bar.

### Quick install (iOS)

1. **Host the files on the public internet.** PWAs require HTTPS.
   Easiest options:
   - **[Netlify Drop](https://app.netlify.com/drop)** — drag the project
     folder onto the page, get a `https://*.netlify.app` URL instantly.
     No account needed.
   - **GitHub Pages** — push the folder to a GitHub repo, enable Pages
     in the repo settings. You'll get a `https://*.github.io/*` URL.
2. On your iPhone, open the URL in **Safari**.
3. Tap the **Share** button (square with arrow).
4. Tap **Add to Home Screen**, then **Add**.
5. The "Imposter" icon now appears on your home screen. Open it — it
   runs in its own window, no address bar, and works offline after the
   first launch.

### Quick install (Android)

Same first two steps. Then in **Chrome**:

1. Chrome may show an install banner automatically — tap **Install**.
2. If not, tap the menu (⋮) → **Install app** / **Add to Home screen**.
3. The icon appears in your app drawer.

### Run locally for testing

Service workers require `http://` or `https://`, not `file://`. To test
the PWA behavior on your computer:

```bash
cd "/Users/kwc/Documents/Vibe Coding/Imposter game"
python3 -m http.server 8000
```

Then open `http://localhost:8000/` in Chrome. The service worker will
register, the app will be cached, and you can verify offline behavior
via DevTools → Application → Service Workers.

### Updating the cached app

When you change the game files, the service worker still serves the
old cached version. To force an update:

1. Bump the version in `sw.js` — change `CACHE_VERSION = 'imposter-v1'`
   to `imposter-v2` (etc.).
2. Re-deploy.
3. On the phone, close and reopen the app (or pull-to-refresh in
   Chrome's install dialog). The new SW will replace the old one and
   re-cache the updated assets.

### PWA files

- `manifest.json` — app name, colors, icon, display mode
- `sw.js` — service worker that caches all files for offline use
- `icon.svg` — the home-screen / app-drawer icon

If you delete or rename any of these three, the app will still work
in a browser but will lose its PWA install + offline capabilities.

## Notes

- **Words:** A single secret word is picked at random from the chosen
  category (`words.js`) when you leave the category screen. Non-imposters
  see the word; imposters see `IMPOSTER` (highlighted in pink).
- **Imposters:** N players are picked at random per round (Fisher–Yates
  shuffle), where N is the number of imposters from the settings screen.
- **Result:** After voting, the result screen compares the voted players
  against the actual imposters. If they match exactly, players win;
  otherwise, the imposters win and the screen reveals who they were.
- **Play again** resets the round state and returns to the category
  screen, keeping player names, count, and round time.
