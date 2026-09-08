/* =========================================================
   Imposter — vanilla JS state machine
   No build step, no dependencies. Just open index.html.
   ========================================================= */

(function () {
  'use strict';

  // ---------- State ----------
  const state = {
    numPlayers: 4,
    numImposters: 1,
    roundTime: 60,           // seconds
    playerNames: [],
    category: 'food',        // 'food' | 'sports'
    revealIndex: 0,
    hypePlayer: '',
    selectedVotes: new Set(),
    // Round-level word (picked once per round from the chosen category)
    roundWord: '',
    // Indices of players who are imposters this round
    imposterIndices: [],
    // What each player sees on the reveal screen (imposters see a marker)
    playerSeenWord: [],
    hypeTimer: null,
    countdownTimer: null,
  };

  // ---------- DOM helpers ----------
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const screens = {
    settings:  $('#screen-settings'),
    players:   $('#screen-players'),
    category:  $('#screen-category'),
    reveal:    $('#screen-reveal'),
    hype:      $('#screen-hype'),
    timer:     $('#screen-timer'),
    vote:      $('#screen-vote'),
    result:    $('#screen-result'),
  };

  function show(name) {
    Object.values(screens).forEach((el) => el.classList.remove('active'));
    screens[name].classList.add('active');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  // ---------- Settings screen ----------
  function readSettingsFromUI() {
    const np = parseInt($('#num-players').value, 10);
    const ni = parseInt($('#num-imposters').value, 10);
    const rt = parseInt($('#round-time').value, 10);

    const valid =
      Number.isFinite(np) && np >= 3 && np <= 20 &&
      Number.isFinite(ni) && ni >= 1 && ni <= Math.max(1, np - 1) &&
      Number.isFinite(rt) && rt >= 5 && rt <= 600;

    $('#btn-from-settings').disabled = !valid;
  }

  function commitSettings() {
    state.numPlayers   = parseInt($('#num-players').value, 10);
    state.numImposters = parseInt($('#num-imposters').value, 10);
    state.roundTime    = parseInt($('#round-time').value, 10);
  }

  function buildPlayerInputs() {
    const container = $('#player-inputs');
    container.innerHTML = '';
    state.playerNames = new Array(state.numPlayers).fill('');

    for (let i = 0; i < state.numPlayers; i++) {
      const wrap = document.createElement('div');
      wrap.className = 'field';
      const label = document.createElement('label');
      label.textContent = `Player ${i + 1}`;
      const input = document.createElement('input');
      input.type = 'text';
      input.maxLength = 20;
      input.autocomplete = 'off';
      input.spellcheck = false;
      input.value = state.playerNames[i] || '';
      input.addEventListener('input', (e) => {
        state.playerNames[i] = e.target.value;
        validatePlayers();
      });
      wrap.appendChild(label);
      wrap.appendChild(input);
      container.appendChild(wrap);
    }
    validatePlayers();
  }

  function validatePlayers() {
    const allFilled = state.playerNames.every((n) => n && n.trim().length > 0);
    $('#btn-from-players').disabled = !allFilled;
  }

  // ---------- Category screen ----------
  function selectCategory(cat) {
    state.category = cat;
    $$('.category-card').forEach((card) => {
      card.classList.toggle('selected', card.dataset.category === cat);
    });
  }

  // ---------- Round setup (called once when leaving the category screen) ----------
  function setupRound() {
    // 1. Pick a single secret word for this round from the chosen category.
    //    Fall back to ['Hello'] if window.WORDS is unavailable for any reason.
    const list = (window.WORDS && window.WORDS[state.category]) || ['Hello'];
    state.roundWord = list[Math.floor(Math.random() * list.length)];

    // 2. Pick N random distinct imposters via a Fisher–Yates partial shuffle.
    const indices = Array.from({ length: state.numPlayers }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    state.imposterIndices = indices.slice(0, state.numImposters);

    // 3. Pre-compute what each player will see on the reveal screen.
    state.playerSeenWord = state.playerNames.map((_, i) =>
      state.imposterIndices.includes(i) ? 'IMPOSTER' : state.roundWord
    );
  }

  // ---------- Reveal screen ----------
    function renderReveal() {
    const name = state.playerNames[state.revealIndex] || `Player ${state.revealIndex + 1}`;
    $('#reveal-player-name').textContent = name;

    // Reset reveal UI
    $('#btn-reveal').hidden = false;
    $('#reveal-word').hidden = true;
    $('#reveal-word-hint').classList.remove('show');
  }

  function showRevealedWord() {
    // Each player sees the per-round word, or the IMPOSTER marker if they
    // happen to be an imposter this round. The value was set by setupRound().
    const text = state.playerSeenWord[state.revealIndex] || 'IMPOSTER';
    const isImposter = state.imposterIndices.includes(state.revealIndex);
    const wordEl = $('#reveal-word-text');
    wordEl.textContent = text;
    wordEl.classList.toggle('is-imposter', isImposter);

    // Show hint for imposters only: first letter of the round word
    const hintEl = $('#reveal-word-hint');
    hintEl.classList.remove('show');
    if (isImposter && state.roundWord) {
      hintEl.textContent = `Hint: ${state.roundWord[0]}`;
      hintEl.classList.add('show');
    }

    $('#btn-reveal').hidden = true;
    $('#reveal-word').hidden = false;
  }

  function hideRevealedWord() {
    $('#reveal-word').hidden = true;
    $('#btn-reveal').hidden = false;
  }

  // ---------- Hype screen ----------
  function startHype() {
    // Pick a random player name to start the discussion with
    const names = state.playerNames.filter((n) => n && n.trim().length > 0);
    const pick = names[Math.floor(Math.random() * names.length)] || '—';
    state.hypePlayer = pick;
    $('#hype-name').textContent = pick;

    clearTimeout(state.hypeTimer);
    state.hypeTimer = setTimeout(() => {
      state.hypeTimer = null;
      startCountdown();
    }, 5000);
  }

  // ---------- Timer screen ----------
  function formatTime(totalSeconds) {
    const s = Math.max(0, totalSeconds);
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  }

  function startCountdown() {
    show('timer');
    let remaining = state.roundTime;
    const display = $('#timer-display');
    display.classList.remove('warning', 'danger');
    display.textContent = formatTime(remaining);

    clearInterval(state.countdownTimer);
    state.countdownTimer = setInterval(() => {
      remaining -= 1;
      display.textContent = formatTime(remaining);

      // Visual urgency thresholds
      if (remaining <= 5) {
        display.classList.add('danger');
        display.classList.remove('warning');
      } else if (remaining <= 10) {
        display.classList.add('warning');
        display.classList.remove('danger');
      } else {
        display.classList.remove('warning', 'danger');
      }

      if (remaining <= 0) {
        clearInterval(state.countdownTimer);
        state.countdownTimer = null;
        goToVote();
      }
    }, 1000);
  }

  // ---------- Vote screen ----------
  function buildVoteGrid() {
    const grid = $('#vote-grid');
    grid.innerHTML = '';
    state.selectedVotes = new Set();

    const subtitle = $('#vote-subtitle');
    subtitle.textContent =
      state.numImposters === 1
        ? 'Select 1 player you think is the imposter'
        : `Select ${state.numImposters} players you think are the imposters`;

    state.playerNames.forEach((name, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'vote-btn';
      btn.textContent = name;
      btn.dataset.index = String(idx);
      btn.addEventListener('click', () => toggleVote(btn, idx));
      grid.appendChild(btn);
    });

    $('#btn-from-vote').disabled = true;
  }

  function toggleVote(btn, idx) {
    if (state.selectedVotes.has(idx)) {
      state.selectedVotes.delete(idx);
      btn.classList.remove('selected');
    } else {
      if (state.selectedVotes.size >= state.numImposters) return; // cap at required
      state.selectedVotes.add(idx);
      btn.classList.add('selected');
    }
    $('#btn-from-vote').disabled = state.selectedVotes.size !== state.numImposters;
  }

  function goToVote() {
    buildVoteGrid();
    show('vote');
  }

  // ---------- Result screen ----------
  function evaluateResult() {
    const voted = new Set(state.selectedVotes);
    const imposters = new Set(state.imposterIndices);
    const sameSize = voted.size === imposters.size;
    const allMatch = sameSize && [...voted].every((i) => imposters.has(i));
    return { won: allMatch, imposters };
  }

  function showResult() {
    const { won, imposters } = evaluateResult();
    const titleEl = $('#result-title');
    const subtitleEl = $('#result-subtitle');
    const impostersEl = $('#result-imposters');

    if (won) {
      titleEl.textContent = 'Players won!';
      subtitleEl.textContent = 'You caught every imposter.';
      if (impostersEl) impostersEl.textContent = '';
    } else {
      titleEl.textContent = 'Imposters won!';
      subtitleEl.textContent =
        imposters.size > 1
          ? 'The imposters escaped detection.'
          : 'The imposter escaped detection.';
      // Pretty-list the actual imposter names so players can confirm.
      if (impostersEl) {
        const names = [...imposters].map((i) => state.playerNames[i]);
        impostersEl.textContent = names.join(' & ');
      }
    }
    show('result');
  }

  // ---------- Navigation ----------
  function goFromSettings() {
    commitSettings();
    buildPlayerInputs();
    show('players');
  }

  function goFromPlayers() {
    // Ensure latest typed values are captured (in case of blur/edge cases)
    $$('#player-inputs input').forEach((inp, i) => {
      state.playerNames[i] = inp.value;
    });
    if (!state.playerNames.every((n) => n && n.trim().length > 0)) return;
    show('category');
  }

  function goFromCategory() {
    state.revealIndex = 0;
    setupRound();
    renderReveal();
    show('reveal');
  }

  function goFromReveal() {
    if (state.revealIndex < state.numPlayers - 1) {
      state.revealIndex += 1;
      renderReveal();
    } else {
      // Last player done — move to hype
      clearTimeout(state.hypeTimer);
      startHype();
      show('hype');
    }
  }

  function goFromVote() {
    showResult();
  }

  function playAgain() {
    // Reset transient state, keep settings & player names
    state.revealIndex = 0;
    state.selectedVotes = new Set();
    state.roundWord = '';
    state.imposterIndices = [];
    state.playerSeenWord = [];
    clearTimeout(state.hypeTimer);
    clearInterval(state.countdownTimer);
    // Default-select Food again
    selectCategory('food');
    show('category');
  }

  function quitGame() {
    // Most browsers block window.close() on windows not opened by script.
    // Try anyway, and fall back to a friendly message.
    const closed = window.close();
    if (!closed) {
      // Replace the result body with a closing message
      $('#result-title').textContent = 'Thanks for playing!';
      $('#result-subtitle').textContent = 'You can close this tab now.';
      $('#btn-play-again').disabled = true;
      $('#btn-quit').disabled = true;
    }
  }

  // ---------- Wire up events ----------
  function init() {
    // Settings
    ['#num-players', '#num-imposters', '#round-time'].forEach((sel) => {
      $(sel).addEventListener('input', readSettingsFromUI);
    });
    $('#btn-from-settings').addEventListener('click', goFromSettings);
    readSettingsFromUI();

    // Players
    $('#btn-from-players').addEventListener('click', goFromPlayers);

    // Category
    $$('.category-card').forEach((card) => {
      card.addEventListener('click', () => selectCategory(card.dataset.category));
    });
    $('#btn-from-category').addEventListener('click', goFromCategory);

    // Reveal
    $('#btn-reveal').addEventListener('click', showRevealedWord);
    $('#btn-hide').addEventListener('click', hideRevealedWord);
    $('#btn-from-reveal').addEventListener('click', goFromReveal);

    // Vote
    $('#btn-from-vote').addEventListener('click', goFromVote);

    // Result
    $('#btn-play-again').addEventListener('click', playAgain);
    $('#btn-quit').addEventListener('click', quitGame);

    // Start on settings
    show('settings');
  }

  // Boot
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
