(function () {
  "use strict";
  const byId = (s) => document.getElementById(s);
  const inp = byId("guessInput"),
    menu = byId("matches"),
    tbody = byId("guessRows");
  const esc = (x) =>
    String(x ?? "").replace(
      /[&<>"']/g,
      (t) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[t],
    );
  const norm = (s) =>
    String(s ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  let pool = [],
    remaining = [],
    secret = null,
    guesses = new Set(),
    ended = false,
    options = [],
    active = 0,
    portraits = new Map();
  let playerGuessCount = 0;
  const revealedHints = new Set();
  const isUrl = (x) => typeof x === "string" && /^https:\/\//.test(x);
  function imgFor(c) {
    return portraits.get(c.name) || c.image_url || "";
  }
  function avatar(c, small) {
    const url = imgFor(c);
    const char = esc((c.name || "?").slice(0, 1).toUpperCase());
    return url ? `<img src="${esc(url)}" loading="lazy" alt="" referrerpolicy="no-referrer" onerror="this.style.display='none';this.parentElement.textContent='${char}'">` : `<span>${char}</span>`;
  }
  // Multilingual presentation: comparisons always use the original JSON values.
  let guessHistory = [];
  let notice = null;
  let finishedWin = null;

  function t(key, fallback = key) {
    const fullKey = `dragonball.${key}`;
    const translated = window.AnimedleI18n?.t(fullKey);
    return typeof translated === "string" && translated !== fullKey ? translated : fallback;
  }
  function format(template, values = {}) {
    return String(template).replace(/\{(\w+)\}/g, (_, field) => String(values[field] ?? ""));
  }
  function valueKey(value) {
    return (
      String(value)
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^A-Za-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "") || "empty"
    );
  }
  function displayValue(group, raw) {
    if (raw === null || raw === undefined) return "?";
    return t(`values.${group}.${valueKey(raw)}`, String(raw));
  }

  function renderFinish() {
    if (finishedWin === null || !secret) return;
    byId("resultTitle").textContent = finishedWin ? t("game.winTitle", "🎉 Personaggio indovinato!") : t("game.revealTitle", "Soluzione rivelata");
    const template = finishedWin ? t("game.winText", "Hai indovinato {name} in {count} tentativi!") : t("game.revealText", "Il personaggio segreto era {name}. Puoi ricominciare subito.");
    byId("resultText").textContent = format(template, { name: secret.name, count: guesses.size });
  }
  function updateAudioLabel() {
    const button = byId("ambientToggle"),
      audio = byId("ambientAudio");
    if (!button || !audio) return;
    const label = audio.paused ? t("page.audioOff", "Attiva atmosfera") : t("page.audioOn", "Disattiva atmosfera");
    button.setAttribute("aria-label", label);
    button.setAttribute("title", label);
  }
  function onLanguageChange() {
    // Re-create only the view: no new secret, no altered guesses or comparisons.
    if (guessHistory.length) {
      tbody.innerHTML = guessHistory.slice().reverse().map(render).join("");
    }
    renderFinish();
    if (menu.classList.contains("open") && inp.value.trim()) search();
    updateAudioLabel();
    updateHints();
  }
  document.addEventListener("animedle:languagechange", onLanguageChange);
  ["play", "pause"].forEach((event) => byId("ambientAudio")?.addEventListener(event, updateAudioLabel));
  updateAudioLabel();
  function shuffle(a) {
    const x = a.slice();
    for (let i = x.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [x[i], x[j]] = [x[j], x[i]];
    }
    return x;
  }
  function getSecret() {
    if (!remaining.length) remaining = shuffle(pool);
    let next = remaining.pop();
    if (secret && next.id === secret.id && pool.length > 1) {
      if (remaining.length) {
        const alt = remaining.pop();
        remaining.push(next);
        next = alt;
      } else {
        remaining = shuffle(pool.filter((c) => c.id !== secret.id));
        next = remaining.pop();
      }
    }
    return next;
  }
  function close() {
    menu.classList.remove("open");
    inp.setAttribute("aria-expanded", "false");
  }
  function search() {
    if (!inp.value.trim() || ended) {
      close();
      return;
    }
    const q = norm(inp.value);
    options = pool
      .filter((c) => !guesses.has(c.id) && [c.name, ...(c.aliases || [])].some((n) => norm(n).includes(q)))
      .sort((a, b) => Number(!norm(a.name).startsWith(q)) - Number(!norm(b.name).startsWith(q)) || a.name.localeCompare(b.name))
      .slice(0, 12);
    active = 0;
    menu.innerHTML = options.length ? options.map((c, i) => `<button type="button" role="option" class="option ${i === 0 ? "active" : ""}" data-i="${i}"><div class="mini-place">${avatar(c, true)}</div><span><strong>${esc(c.name)}</strong><small>${esc(displayValue("series", c.series))} · ${esc(displayValue("race", c.race))}</small></span></button>`).join("") : `<div class="option">${esc(t("game.noResults", "Nessun personaggio trovato"))}</div>`;
    menu.classList.add("open");
    inp.setAttribute("aria-expanded", "true");
  }
  function equals(a, b) {
    return String(a) === String(b);
  }
  const unset = (v) => v === null || v === undefined || v === "" || v === "Sconosciuto" || v === "Sconosciuta";
  function state(a, b, kind) {
    if (unset(a) || unset(b)) return "wrong";
    if (equals(a, b)) return "correct";
    if (kind === "hair" && ["Calvo", "Nessuno"].includes(a) && ["Calvo", "Nessuno"].includes(b)) return "partial";
    if (kind === "series") {
      const base = (s) => String(s).replace(/ · Film$/, "");
      if (base(a) === base(b)) return "partial";
    }
    return "wrong";
  }
  function tile(v, cls, extra = "") {
    return `<div class="tile ${cls} ${extra}">${v}</div>`;
  }
  function value(v, field) {
    return esc(displayValue(field, v));
  }
  function card(c) {
    return tile(`<div class="photo">${avatar(c)}</div><span class="name">${esc(c.name)}</span>`, "portrait ");
  }
  function cell(c, field, kind) {
    const v = c[field];
    const status = c.id === secret.id ? "correct" : state(v, secret[field], kind);
    return tile(field === "series" ? `<span class="series-label">${value(v, field)}</span>` : value(v, field), status, field === "episode" && v === "Film" ? "film" : "");
  }
  function render(c) {
    return `<tr><td>${card(c)}</td><td>${cell(c, "gender")}</td><td>${cell(c, "hair", "hair")}</td><td>${cell(c, "origin")}</td><td>${cell(c, "race")}</td><td>${cell(c, "saga")}</td><td>${cell(c, "series", "series")}</td></tr>`;
  }
  function finish(win) {
    ended = true;
    updateHints();
    inp.disabled = true;
    byId("submitGuess").disabled = true;
    byId("showAnswer").disabled = true;
    close();
    byId("result").classList.add("open");
    byId("result").classList.toggle("revealed", !win);
    finishedWin = win;
    renderFinish();
  }

  function updateHints() {
    const panel = byId("hintPanel");
    if (!panel) return;

    // Nasconde gli indizi prima del primo tentativo
    // oppure quando la partita è terminata.
    panel.hidden = !secret || ended || playerGuessCount === 0;
    if (panel.hidden) return;

    // Riutilizza le traduzioni degli indizi di One Piece.
    function hintText(key, fallback) {
      const path = `dragonball.hints.${key}`;
      const translated = window.AnimedleI18n?.t(path);

      return typeof translated === "string" && translated !== path ? translated : fallback;
    }

    const hints = [
      {
        id: "hintSaga",
        type: "saga",
        unlockAt: 5,
        value: displayValue("saga", secret.saga),
      },
      {
        id: "hintRace",
        type: "race",
        unlockAt: 8,
        value: displayValue("race", secret.race),
      },
    ];

    for (const hint of hints) {
      const element = byId(hint.id);
      const card = element.closest(".hint-card");

      const remaining = Math.max(0, hint.unlockAt - playerGuessCount);

      const unlocked = remaining === 0;
      const revealed = revealedHints.has(hint.type);

      if (!unlocked) {
        // Indizio ancora bloccato.
        const key = remaining === 1 ? "lockedOne" : "lockedMany";

        const fallback = remaining === 1 ? "Si sblocca tra {count} tentativo" : "Si sblocca tra {count} tentativi";

        element.textContent = hintText(key, fallback).replace("{count}", remaining);
      } else if (!revealed) {
        // Disponibile, ma non ancora rivelato.
        element.textContent = hintText("clickToReveal", "Clicca per rivelare");
      } else {
        // Rivelato su richiesta del giocatore.
        element.textContent = hint.value;
      }

      card.disabled = !unlocked || revealed;

      card.classList.toggle("available", unlocked && !revealed);

      card.classList.toggle("unlocked", revealed);
    }
  }

  function guess(c) {
    if (!c || ended) return;
    if (guesses.has(c.id)) {
      return;
    }
    const first = guesses.size === 0;
    playerGuessCount++;
    guesses.add(c.id);
    guessHistory.push(c);
    if (first) tbody.innerHTML = "";
    tbody.insertAdjacentHTML("afterbegin", render(c));
    tbody.firstElementChild.classList.add("riga-animata");
    updateHints();
    inp.value = "";
    close();
    if (c.id === secret.id) {
      finish(true);
      return;
    }
  }
  function submit() {
    if (ended) return;
    const q = norm(inp.value);
    if (!q) {
      return;
    }
    const exact = pool.find((c) => !guesses.has(c.id) && [c.name, ...(c.aliases || [])].some((v) => norm(v) === q));
    const selected = exact || (menu.classList.contains("open") && options.length && norm(options[0].name).startsWith(q) ? options[0] : null);
    if (selected) guess(selected);
    else {
      search();
    }
  }
  function begin() {
    if (!pool.length) {
      return;
    }
    secret = getSecret();
    guesses.clear();
    playerGuessCount = 0;
    guessHistory = [];
    finishedWin = null;
    ended = false;
    revealedHints.clear();
    updateHints();
    tbody.innerHTML = '<tr><td colspan="7" class="empty"></td></tr>';
    inp.value = "";
    inp.disabled = false;
    byId("submitGuess").disabled = false;
    byId("showAnswer").disabled = false;
    byId("result").className = "result";
    close();
  }
  inp.addEventListener("input", search);
  inp.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      close();
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (menu.classList.contains("open") && options.length) guess(options[active]);
      else submit();
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!menu.classList.contains("open") || !options.length) return;
      e.preventDefault();
      active = (active + (e.key === "ArrowDown" ? 1 : -1) + options.length) % options.length;
      menu.querySelectorAll("button.option").forEach((x, i) => x.classList.toggle("active", i === active));
    }
  });
  menu.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-i]");
    if (btn) guess(options[Number(btn.dataset.i)]);
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search")) close();
  });
  byId("submitGuess").addEventListener("click", submit);
  byId("restart").addEventListener("click", begin);
  byId("again").addEventListener("click", begin);

  byId("showAnswer").addEventListener("click", () => {
    if (secret && !ended) {
      if (!guesses.has(secret.id)) {
        const first = guesses.size === 0;

        guesses.add(secret.id);
        guessHistory.push(secret);

        tbody.insertAdjacentHTML("afterbegin", render(secret));
        tbody.firstElementChild.classList.add("riga-animata");
      }

      finish(false);
    }
  });
  byId("hintPanel").addEventListener("click", (event) => {
    const card = event.target.closest(".hint-card");

    if (!card || ended) return;

    const hint = card.dataset.hint;

    const unlockAt = {
      saga: 5,
      race: 8,
    }[hint];

    if (!unlockAt || playerGuessCount < unlockAt || revealedHints.has(hint)) {
      return;
    }

    revealedHints.add(hint);
    updateHints();
  });

  fetch("./characters.json", {
    cache: "no-store",
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error("Dataset vuoto o non valido");
      }

      pool = data;
      begin();
    })
    .catch((error) => {
      console.error("Errore caricamento personaggi:", error);
    });
})();
