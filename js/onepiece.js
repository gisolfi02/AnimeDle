(() => {
  "use strict";
  const el = (id) => document.getElementById(id);
  const input = el("guessInput"),
    suggestions = el("suggestions"),
    rows = el("guessRows"),
    status = el("status");
  const imageError = "this.style.opacity='0'";
  const norm = (s) =>
    String(s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("it")
      .trim();
  const escapeHTML = (s) =>
    String(s == null ? "" : s).replace(
      /[&<>\"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const numberLocales = {
    it: "it-IT",
    en: "en-GB",
    es: "es-ES",
    fr: "fr-FR",
    de: "de-DE",
  };

  const numberLocale = numberLocales[window.AnimedleI18n?.getLanguage()] || "it-IT";
  // Non modifichiamo mai i valori nel JSON: traduciamo solo quanto si vede.
  const translate = (key, fallback = key) => {
    const value = window.AnimedleI18n?.t(key);
    return typeof value === "string" && value !== key ? value : fallback;
  };
  const fill = (template, data = {}) => template.replace(/\{(\w+)\}/g, (_, key) => String(data[key] ?? ""));
  const translatedValue = (group, original) => {
    const key = String(original ?? "").replace(/[^a-zA-Z0-9_]/g, "_");
    return translate(`onepiece.values.${group}.${key}`, String(original ?? ""));
  };
  const gm = (key, fallback, data) => fill(translate(`onepiece.game.${key}`, fallback), data);

  const pool = [];
  let currentStatus = null;
  function showStatus(key, fallback, data = {}) {
    currentStatus = { key, fallback, data };
    setStatus(gm(key, fallback, data));
  }
  function translateExistingGame() {
    // Cambio lingua a partita in corso: nessun reset e nessun nuovo tentativo.
    if (guessed.size) {
      const byId = new Map(pool.map((character) => [character.id, character]));
      rows.innerHTML = Array.from(guessed)
        .reverse()
        .map((id) => (byId.has(id) ? makeRow(byId.get(id)) : ""))
        .join("");
    }
    if (finished) updateEndPanel();
    else if (currentStatus) {
      const { key, fallback, data } = currentStatus;
      setStatus(gm(key, fallback, data));
    }
    if (suggestions.classList.contains("show")) renderSuggestions();
    updateAmbientAccessibility();
  }
  function updateAmbientAccessibility() {
    const button = el("ambientToggle");
    const audio = el("ambientAudio");
    if (!button || !audio) return;
    button.setAttribute("aria-label", translate(audio.paused ? "onepiece.page.audioOff" : "onepiece.page.audioOn", audio.paused ? "Attiva atmosfera" : "Disattiva atmosfera"));
  }
  document.addEventListener("animedle:languagechange", translateExistingGame);
  el("ambientAudio")?.addEventListener("play", updateAmbientAccessibility);
  el("ambientAudio")?.addEventListener("pause", updateAmbientAccessibility);
  let deck = [],
    secret = null,
    guessed = new Set(),
    won = false,
    finished = false,
    currentOptions = [],
    activeIndex = 0;
  function shuffled(a) {
    const b = [...a];
    for (let i = b.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [b[i], b[j]] = [b[j], b[i]];
    }
    return b;
  }
  function newSecret() {
    if (!deck.length) deck = shuffled(pool);
    let next = deck.pop();
    if (secret && next.id === secret.id && pool.length > 1) {
      if (deck.length) {
        const another = deck.pop();
        deck.push(next);
        next = another;
      } else {
        deck = shuffled(pool.filter((c) => c.id !== secret.id));
      }
    }
    return next;
  }
  function setStatus(msg) {
    if (status) status.textContent = msg;
  }
  function closeSuggestions() {
    suggestions.classList.remove("show");
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
  }
  function renderSuggestions() {
    if (finished) {
      closeSuggestions();
      return;
    }
    const q = norm(input.value);
    if (!q) {
      closeSuggestions();
      return;
    }
    currentOptions = pool
      .filter((c) => !guessed.has(c.id) && [c.name, ...(c.aliases || [])].some((n) => norm(n).includes(q)))
      .sort((a, b) => {
        const ap = norm(a.name).startsWith(q) ? 0 : 1,
          bp = norm(b.name).startsWith(q) ? 0 : 1;
        return ap - bp || a.name.localeCompare(b.name, "it");
      })
      .slice(0, 9);
    activeIndex = 0;
    if (!currentOptions.length) {
      suggestions.innerHTML = `<div class="empty">${escapeHTML(gm("noResults", "Nessun personaggio disponibile con questo nome."))}</div>`;
    } else {
      suggestions.innerHTML = currentOptions.map((c, i) => `<button class="result ${i === activeIndex ? "active" : ""}" id="opt-${i}" data-index="${i}" role="option" aria-selected="${i === activeIndex}"><img class="small-avatar" src="${escapeHTML(c.image_url)}" alt="" loading="lazy" onerror="${imageError}"><span><span class="result-name">${escapeHTML(c.name)}</span><br><span class="result-meta">${escapeHTML(translatedValue("affiliation", c.affiliation))}</span></span></button>`).join("");
    }
    suggestions.classList.add("show");
    input.setAttribute("aria-expanded", "true");
    updateActive();
  }
  function updateActive() {
    suggestions.querySelectorAll(".result").forEach((b, i) => {
      b.classList.toggle("active", i === activeIndex);
      b.setAttribute("aria-selected", String(i === activeIndex));
    });
    if (currentOptions.length) {
      input.setAttribute("aria-activedescendant", "opt-" + activeIndex);
    }
  }
  function pickCharacter(c) {
    if (!c) return;
    input.value = c.name;
    closeSuggestions();
    makeGuess(c);
  }
  function compareScalar(guess, answer) {
    return norm(guess) === norm(answer) ? "correct" : "wrong";
  }
  function hakiTypes(c) {
    return ["observation", "armament", "conqueror"].filter((t) => c.haki && c.haki[t]);
  }
  function hakiStatus(g, s) {
    const a = hakiTypes(g),
      b = hakiTypes(s);
    if (a.join("|") === b.join("|")) return "correct";
    if (a.some((x) => b.includes(x))) return "partial";
    return "wrong";
  }
  function hakiLabel(c) {
    const dict = { observation: "👁️", armament: "✊", conqueror: "👑" };
    const types = hakiTypes(c);
    return types.length ? types.map((x) => dict[x]).join(" ") : gm("none", "Nessuno");
  }
  function statusAttr(x) {
    return x === "correct" ? gm("statusCorrect", "Corretto") : x === "partial" ? gm("statusPartial", "Parziale") : x === "unknown" ? gm("statusUnknown", "Sconosciuto") : gm("statusWrong", "Non corretto");
  }
  function tile(value, st, extra = "") {
    return `<div class="tile ${st}" title="${statusAttr(st)}">${value}${extra}</div>`;
  }
  function compareNumber(g, s, display, unit = "") {
    if (!Number.isFinite(g) || !Number.isFinite(s)) return tile(display, "unknown");
    const good = Math.abs(g - s) < 0.0001;
    const arrow = good
      ? ""
      : `<span class="arrow" aria-label="${s > g ? gm("directionHigher", "La risposta è più alta") : gm("directionLower", "La risposta è più bassa")}">${
          s > g
            ? `<i
              class="fa-solid fa-arrow-up"
              style="color: rgb(255, 255, 255)"
            ></i>`
            : `<i
              class="fa-solid fa-arrow-down"
              style="color: rgb(255, 255, 255)"
            ></i>`
        }</span>`;
    return tile(`<span class="num">${display}</span>` + (unit ? `<span class="tiny">${unit}</span>` : ""), good ? "correct" : "wrong", arrow);
  }
  function compactBounty(x) {
    if (x === 0) return "0 ฿";
    if (x >= 1e9) return `${numFmt(x / 1e9)} ${gm("billions", "Mld")}`;
    if (x >= 1e6) return `${numFmt(x / 1e6)} ${gm("millions", "Mln")}`;
    return x.toLocaleString(numberLocale) + " ฿";
  }
  function numFmt(n) {
    return Number(n.toFixed(3)).toLocaleString(numberLocale, {
      maximumFractionDigits: 3,
    });
  }
  function numericTile(g, s, label) {
    return compareNumber(g, s, label);
  }
  function arcTile(g, s) {
    if (g.first_arc_order === s.first_arc_order) return tile(escapeHTML(translatedValue("arc", g.first_arc)), "correct");
    const arrow =
      s.first_arc_order > g.first_arc_order
        ? `<i
              class="fa-solid fa-arrow-up"
              style="color: rgb(255, 255, 255)"
            ></i>`
        : `<i
              class="fa-solid fa-arrow-down"
              style="color: rgb(255, 255, 255)"
            ></i>`;
    return tile(escapeHTML(translatedValue("arc", g.first_arc)), "wrong", `<span class="arrow">${arrow}</span>`);
  }
  function makeRow(c) {
    const g = c,
      s = secret,
      truth = g.id === s.id;
    const photo = `<div class="tile character-tile ${truth ? "hit" : ""}" title="${escapeHTML(g.name)}"><img src="${escapeHTML(g.image_url)}" alt="" loading="lazy" onerror="${imageError}"><span class="character-name">${escapeHTML(g.name)}</span></div>`;
    const dev = translatedValue("fruit", g.devil_fruit_type);
    const height = g.height_cm ? `${numFmt(g.height_cm / 100)} m` : gm("unknown", "Sconosciuta");
    const gender = g.gender === "Male" ? gm("male", "Maschio") : g.gender === "Female" ? gm("female", "Femmina") : g.gender;
    return `<tr><td>${photo}</td><td>${tile(escapeHTML(gender), compareScalar(g.gender, s.gender))}</td><td>${tile(escapeHTML(translatedValue("affiliation", g.affiliation)), compareScalar(g.affiliation, s.affiliation))}</td><td>${tile(escapeHTML(dev), compareScalar(g.devil_fruit_type, s.devil_fruit_type))}</td><td>${tile(hakiLabel(g), hakiStatus(g, s))}</td><td>${numericTile(g.bounty_beli, s.bounty_beli, compactBounty(g.bounty_beli))}</td><td>${compareNumber(g.height_cm || NaN, s.height_cm || NaN, height)}</td><td>${tile(escapeHTML(translatedValue("origin", g.origin)), compareScalar(g.origin, s.origin))}</td><td>${arcTile(g, s)}</td></tr>`;
  }
  function makeGuess(c) {
    if (finished) return;
    if (guessed.has(c.id)) {
      showStatus("alreadyGuessed", "Hai già provato questo personaggio.");
      return;
    }
    const first = guessed.size === 0;
    guessed.add(c.id);
    if (first) rows.innerHTML = "";
    rows.insertAdjacentHTML("afterbegin", makeRow(c));
    rows.firstElementChild.classList.add("riga-animata");
    input.value = "";
    closeSuggestions();
    if (c.id === secret.id) {
      won = true;
      endGame(true);
    } else {
      showStatus("attemptCount", "Tentativi effettuati: {count} · Personaggi disponibili: {remaining}", { count: guessed.size, remaining: pool.length - guessed.size });
      input.focus();
    }
  }
  function updateEndPanel() {
    const title = el("endTitle"),
      description = el("endText");
    if (!secret) return;
    title.textContent = won ? gm("winTitle", "🎉 Personaggio indovinato!") : gm("revealTitle", "Soluzione rivelata");
    description.textContent = won
      ? gm("winText", "Hai trovato {name} in {count} {attemptWord}!", {
          name: secret.name,
          count: guessed.size,
          attemptWord: guessed.size === 1 ? gm("attemptOne", "tentativo") : gm("attemptMany", "tentativi"),
        })
      : gm("revealText", "Il personaggio segreto era {name}. Puoi ricominciare subito.", { name: secret.name });
  }
  function endGame(success) {
    finished = true;
    won = success;
    input.disabled = true;
    el("guessBtn").disabled = true;
    el("reveal").disabled = true;
    closeSuggestions();
    const win = el("endPanel");
    win.classList.toggle("lost", !success);
    win.classList.add("show");
    updateEndPanel();
    currentStatus = null;
    setStatus("");
  }
  function begin() {
    secret = newSecret();
    guessed = new Set();
    won = false;
    finished = false;
    rows.innerHTML = '<tr><td colspan="9" class="empty"></td></tr>';
    input.disabled = false;
    el("guessBtn").disabled = false;
    el("reveal").disabled = false;
    el("endPanel").classList.remove("show", "lost");
    input.value = "";
    closeSuggestions();
    showStatus("intro", "{total} personaggi da indovinare · Nessun limite di tentativi", { total: pool.length });
    input.focus();
  }
  input.addEventListener("input", renderSuggestions);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeSuggestions();
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!currentOptions.length || !suggestions.classList.contains("show")) return;
      e.preventDefault();
      activeIndex = (activeIndex + (e.key === "ArrowDown" ? 1 : -1) + currentOptions.length) % currentOptions.length;
      updateActive();
      suggestions.querySelector(".active")?.scrollIntoView({ block: "nearest" });
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      submitGuess();
    }
  });
  suggestions.addEventListener("mousedown", (e) => e.preventDefault());
  suggestions.addEventListener("click", (e) => {
    const hit = e.target.closest(".result");
    if (hit) pickCharacter(currentOptions[Number(hit.dataset.index)]);
  });
  function submitGuess() {
    if (finished) return;
    const q = norm(input.value);
    if (!q) return showStatus("searchEmpty", "Scrivi il nome di un personaggio.");
    const exact = pool.find((c) => !guessed.has(c.id) && [c.name, ...(c.aliases || [])].some((n) => norm(n) === q));
    if (exact) return pickCharacter(exact);
    if (currentOptions.length && suggestions.classList.contains("show")) return pickCharacter(currentOptions[activeIndex]);
    showStatus("searchSelect", "Seleziona un personaggio dall’elenco.");
    renderSuggestions();
  }
  el("guessBtn").addEventListener("click", submitGuess);
  el("newGame").addEventListener("click", begin);
  el("playAgain").addEventListener("click", begin);
  el("reveal").addEventListener("click", () => {
    if (!finished && secret) {
      if (!guessed.has(secret.id)) {
        guessed.add(secret.id);

        rows.insertAdjacentHTML("afterbegin", makeRow(secret));
        rows.firstElementChild.classList.add("riga-animata");
      }

      endGame(false);
    }
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-area")) closeSuggestions();
  });
  // I dati vengono caricati una sola volta dal JSON esterno.
  // Il percorso è relativo alla pagina onepiece/index.html, non al file js/onepiece.js.
  input.disabled = true;
  el("guessBtn").disabled = true;
  el("reveal").disabled = true;
  showStatus("loading", "Caricamento dei personaggi...");

  fetch("./characters.json", { cache: "no-store" })
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then((data) => {
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error("Il dataset deve essere un array non vuoto");
      }
      if (data.some((c) => !c || c.id == null || typeof c.name !== "string")) {
        throw new Error("Uno o più personaggi hanno dati non validi");
      }
      pool.push(...data);
      begin();
    })
    .catch((error) => {
      console.error("Errore caricamento personaggi OnePiecedle:", error);
      input.disabled = true;
      el("guessBtn").disabled = true;
      el("reveal").disabled = true;
      showStatus("loadError", "Impossibile caricare characters.json. Verifica il percorso e apri il gioco tramite GitHub Pages o un server locale.");
    });
})();
