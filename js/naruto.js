(function () {
  "use strict";
  const byId = (id) => document.getElementById(id);
  const input = byId("guessInput"),
    list = byId("matches"),
    rows = byId("guessRows");
  let pool = [],
    deck = [],
    secret = null,
    guesses = new Set(),
    ended = false,
    current = [],
    active = 0;
  let playerGuessCount = 0;
  const revealedHints = new Set();
  const esc = (value) =>
    String(value == null ? "" : value).replace(
      /[&<>"']/g,
      (a) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[a],
    );
  const norm = (s) =>
    String(s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  const status = (s) => (byId("message").textContent = s);
  const safeImg = (url) => (typeof url === "string" && /^https:\/\//i.test(url) ? url : "");
  function shuffle(a) {
    const b = a.slice();
    for (let i = b.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = b[i];
      b[i] = b[j];
      b[j] = t;
    }
    return b;
  }
  function nextSecret() {
    if (!deck.length) deck = shuffle(pool);
    let n = deck.pop();
    if (secret && n.id === secret.id && pool.length > 1) {
      if (deck.length) {
        let alt = deck.pop();
        deck.push(n);
        n = alt;
      } else {
        deck = shuffle(pool.filter((x) => x.id !== secret.id));
        n = deck.pop();
      }
    }
    return n;
  }
  function closeList() {
    list.classList.remove("open");
    input.setAttribute("aria-expanded", "false");
  }
  function showList() {
    const q = norm(input.value);
    if (!q || ended) {
      closeList();
      return;
    }
    current = pool
      .filter((x) => !guesses.has(x.id) && [x.name].concat(x.aliases || []).some((n) => norm(n).includes(q)))
      .sort((a, b) => Number(!norm(a.name).startsWith(q)) - Number(!norm(b.name).startsWith(q)) || a.name.localeCompare(b.name))
      .slice(0, 12);
    active = 0;
    if (!current.length) {
      list.innerHTML = '<div class="option">Nessun personaggio trovato</div>';
    } else {
      list.innerHTML = current.map((c, i) => `<button type="button" class="option ${i === 0 ? "active" : ""}" data-index="${i}" role="option" aria-selected="${i === 0}"><img class="mini" loading="lazy" referrerpolicy="no-referrer" src="${esc(safeImg(c.image_url))}" alt="" onerror="this.style.visibility='hidden'"><span><span class="opt-name">${esc(c.name)}</span><br><span class="opt-sub">${esc(c.affiliations.join(", ") || "Affiliazione non nota")}</span></span></button>`).join("");
    }
    list.classList.add("open");
    input.setAttribute("aria-expanded", "true");
  }
  function arrState(a, b) {
    const aa = new Set(a || []),
      bb = new Set(b || []);
    if (aa.size === bb.size && [...aa].every((x) => bb.has(x))) return "correct";
    if ([...aa].some((x) => bb.has(x))) return "partial";
    return "wrong";
  }
  function scalarState(a, b) {
    return a === b ? "correct" : "wrong";
  }
  function tile(content, klass) {
    return `<div class="tile ${klass}">${content}</div>`;
  }
  function textLabels(a) {
    return a && a.length ? a.map((v) => `<span class="tag">${esc(v)}</span>`).join("") : '<span class="tag">Nessuno</span>';
  }
  const symbols = {
    Fuoco: "🔥",
    Acqua: "💧",
    Vento: "🌪️",
    Fulmine: "⚡",
    Terra: "🪨",
  };
  const fiveNatures = new Set(["Fuoco", "Acqua", "Vento", "Fulmine", "Terra"]);
  const onlyFive = (list) => (Array.isArray(list) ? list.filter((n) => fiveNatures.has(n)) : []);
  function natureLabels(a) {
    return a && a.length ? a.map((n) => `<span class="nitem" title="${esc(n)}"><span class="nature-emoji">${symbols[n] || "✦"}</span>${esc(n)}</span>`).join("") : '<span class="tag">Nessuna</span>';
  }

  function arcTile(g, s) {
    if (g.first_arc_order === s.first_arc_order) {
      return tile(esc(g.first_arc), "correct");
    }

    const up = s.first_arc_order > g.first_arc_order;
    const direction = up ? "arc-up" : "arc-down";

    const explanation = up ? "Soluzione in un arco successivo" : "Soluzione in un arco precedente";

    return `
        <div class="tile wrong arc-direction ${direction}"
             title="${explanation}"
             aria-label="${esc(g.first_arc)} — ${explanation}">
            <span class="arc-label">${esc(g.first_arc)}</span>
        </div>
    `;
  }

  function renderGuess(c) {
    let url = esc(safeImg(c.image_url));
    let picture = `<div class="tile portrait"><div class="portrait-media"><b>${esc(c.name.charAt(0).toUpperCase())}</b><img src="${url}" loading="lazy" referrerpolicy="no-referrer" alt="" onerror="this.style.display='none'"></div><span class="name">${esc(c.name)}</span></div>`;
    return `<tr><td>${picture}</td><td>${tile(esc(c.gender), scalarState(c.gender, secret.gender))}</td><td>${tile(textLabels(c.affiliations), arrState(c.affiliations, secret.affiliations))}</td><td>${tile(textLabels(c.jutsu_types), arrState(c.jutsu_types, secret.jutsu_types))}</td><td>${tile(textLabels(c.kekkei_genkai_types), arrState(c.kekkei_genkai_types, secret.kekkei_genkai_types))}</td><td>${tile(natureLabels(onlyFive(c.nature_types)), arrState(onlyFive(c.nature_types), onlyFive(secret.nature_types)))}</td><td>${tile(textLabels(c.attributes), arrState(c.attributes, secret.attributes))}</td><td>${arcTile(c, secret)}</td></tr>`;
  }
  function finish(win) {
    ended = true;
    updateHints();
    input.disabled = true;
    byId("submitGuess").disabled = true;
    byId("showAnswer").disabled = true;
    closeList();
    const r = byId("result");
    r.classList.add("open");
    r.classList.toggle("revealed", !win);
    byId("resultTitle").textContent = win ? "🎉 Personaggio indovinato!" : "Soluzione rivelata";
    byId("resultText").textContent = win ? `Hai trovato ${secret.name} in ${guesses.size} tentativi!` : `Il personaggio segreto era ${secret.name}. Puoi ricominciare subito.`;
    status("");
  }

  function updateHints() {
    const panel = byId("hintPanel");
    if (!panel || !secret) return;

    // Prima del primo tentativo o a partita conclusa.
    panel.hidden = playerGuessCount === 0 || ended;
    if (panel.hidden) return;

    const arcValue = secret.first_arc ? translatedValue("arc", secret.first_arc) : t("naruto.game.none", "Nessuno");

    const affiliationValue = Array.isArray(secret.affiliations) && secret.affiliations.length ? secret.affiliations.map((a) => translatedValue("affiliations", a)).join(", ") : t("naruto.game.unknownAffiliation", "Affiliazione non nota");

    const hints = [
      {
        id: "hintArc",
        type: "arc",
        unlockAt: 5,
        value: arcValue,
      },
      {
        id: "hintAffiliation",
        type: "affiliation",
        unlockAt: 8,
        value: affiliationValue,
      },
    ];

    for (const hint of hints) {
      const element = byId(hint.id);
      const card = element.closest(".hint-card");

      const remaining = Math.max(0, hint.unlockAt - playerGuessCount);

      const unlocked = remaining === 0;
      const revealed = revealedHints.has(hint.type);

      if (!unlocked) {
        const key = remaining === 1 ? "naruto.hints.lockedOne" : "naruto.hints.lockedMany";

        const fallback = remaining === 1 ? "Si sblocca tra {count} tentativo" : "Si sblocca tra {count} tentativi";

        element.textContent = format(t(key, fallback), { count: remaining });
      } else if (!revealed) {
        element.textContent = t("naruto.hints.clickToReveal", "Clicca per rivelare");
      } else {
        element.textContent = hint.value;
      }

      card.disabled = !unlocked || revealed;
      card.classList.toggle("available", unlocked && !revealed);
      card.classList.toggle("unlocked", revealed);
    }
  }

  function makeGuess(c) {
    if (!c || ended) return;
    if (guesses.has(c.id)) {
      status("Hai già provato questo personaggio.");
      return;
    }
    const first = guesses.size === 0;
    guesses.add(c.id);
    playerGuessCount++;
    if (first) rows.innerHTML = "";
    rows.insertAdjacentHTML("afterbegin", renderGuess(c));
    rows.firstElementChild.classList.add("riga-animata");
    updateHints();
    input.value = "";
    closeList();
    if (c.id === secret.id) {
      finish(true);
      return;
    }
    status(`Tentativi: ${guesses.size} · ${pool.length - guesses.size} personaggi ancora da provare`);
  }
  function submit() {
    if (ended) return;
    const q = norm(input.value);
    if (!q) {
      status("Scrivi un nome per iniziare.");
      return;
    }
    const c = pool.find((x) => !guesses.has(x.id) && [x.name].concat(x.aliases || []).some((n) => norm(n) === q)) || (current.length && norm(current[0].name).startsWith(q) ? current[0] : null);
    if (!c) {
      status("Seleziona un personaggio dall’elenco dei suggerimenti.");
      showList();
      return;
    }
    makeGuess(c);
  }
  function begin() {
    if (!pool.length) {
      status("Nessun personaggio disponibile.");
      return;
    }
    secret = nextSecret();
    guesses = new Set();
    playerGuessCount = 0;
    revealedHints.clear();
    updateHints();
    ended = false;
    rows.innerHTML = '<tr><td colspan="8" class="empty"></td></tr>';
    input.value = "";
    input.disabled = false;
    byId("submitGuess").disabled = false;
    byId("showAnswer").disabled = false;
    byId("result").classList.remove("open", "revealed");
    closeList();
    status(`${pool.length} personaggi · Partite infinite · Nessun limite di tentativi`);
  }
  input.addEventListener("input", showList);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeList();
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (list.classList.contains("open") && current.length) makeGuess(current[active]);
      else submit();
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!current.length || !list.classList.contains("open")) return;
      e.preventDefault();
      active = (active + (e.key === "ArrowDown" ? 1 : -1) + current.length) % current.length;
      list.querySelectorAll(".option").forEach((b, i) => b.classList.toggle("active", i === active));
    }
  });
  list.addEventListener("click", (e) => {
    const el = e.target.closest("button.option");
    if (el) makeGuess(current[Number(el.dataset.index)]);
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".input-wrap")) closeList();
  });
  byId("submitGuess").addEventListener("click", submit);
  byId("restart").addEventListener("click", begin);
  byId("again").addEventListener("click", begin);
  byId("showAnswer").addEventListener("click", () => {
    if (secret && !ended) {
      if (!guesses.has(secret.id)) {
        const first = guesses.size === 0;

        guesses.add(secret.id);

        rows.insertAdjacentHTML("afterbegin", renderGuess(secret));
        rows.firstElementChild.classList.add("riga-animata");
      }

      finish(false);
    }
  });

  byId("hintPanel").addEventListener("click", (event) => {
    const card = event.target.closest(".hint-card");

    if (!card || ended) return;

    const hint = card.dataset.hint;

    const unlockAt = {
      arc: 5,
      affiliation: 8,
    }[hint];

    if (!unlockAt || playerGuessCount < unlockAt || revealedHints.has(hint)) {
      return;
    }

    revealedHints.add(hint);
    updateHints();
  });

  // On GitHub Pages characters.json is the editable source of truth.
  // file:// local opens use the embedded fallback to work without any server.
  fetch("./characters.json", { cache: "no-store" })
    .then((r) => {
      if (!r.ok) throw Error("Data not available");
      return r.json();
    })
    .catch(() => fallback)
    .then((data) => {
      if (!Array.isArray(data) || !data.length) throw Error("Empty dataset");
      pool = data;
      begin();
    })
    .catch((e) => {
      status("Impossibile caricare il dataset: " + e.message);
    });

  /* ==========================================================
   * Naruto — Localizzazione IT / EN integrata nel gioco
   * Si appoggia al motore condiviso js/i18n.js, senza
   * alterare JSON, tentativi, confronti o animazioni.
   * ========================================================== */

  const originals = new WeakMap();
  const originalTitles = new WeakMap();
  const originalAriaLabels = new WeakMap();

  function t(key, fallback = key) {
    const result = window.AnimedleI18n?.t(key);
    return typeof result === "string" && result !== key ? result : fallback;
  }

  function format(template, values = {}) {
    return template.replace(/\{(\w+)\}/g, (_, id) => String(values[id] ?? ""));
  }

  // Identical, stable keys to those generated from the JSON dataset.
  function valueKey(input) {
    return (
      String(input)
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^A-Za-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "") || "empty"
    );
  }

  function val(group, original) {
    if (!original) return original;
    return t(`naruto.values.${group}.${valueKey(original)}`, original);
  }

  function translatedValue(group, original) {
    if (original === "Nessuno") return t("naruto.game.none", original);
    if (original === "Nessuna") return t("naruto.game.noneF", original);
    if (original === "Affiliazione non nota") {
      return t("naruto.game.unknownAffiliation", original);
    }
    return val(group, original);
  }

  // The searchable affiliation preview contains a comma-separated list,
  // whereas clue-table values are rendered as individual <span> elements.
  function affiliationPreview(original) {
    if (original === "Affiliazione non nota") return translatedValue("affiliations", original);
    return original
      .split(", ")
      .map((entry) => translatedValue("affiliations", entry))
      .join(", ");
  }

  function setNode(node, converter) {
    if (node.nodeType !== Node.TEXT_NODE) return;
    if (!originals.has(node)) originals.set(node, node.nodeValue);
    const raw = originals.get(node);
    const parts = raw.match(/^(\s*)([\s\S]*?)(\s*)$/);
    if (!parts || !parts[2]) return;
    const replacement = converter(parts[2]);
    const next = parts[1] + replacement + parts[3];
    if (node.nodeValue !== next) node.nodeValue = next;
  }

  function textNodes(element, converter, excludedSelector = null) {
    const walk = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walk.nextNode())) {
      if (excludedSelector && node.parentElement?.closest(excludedSelector)) continue;
      setNode(node, converter);
    }
  }

  function title(element, converter) {
    if (!originalTitles.has(element)) originalTitles.set(element, element.getAttribute("title"));
    const raw = originalTitles.get(element);
    if (raw == null) return;
    const next = converter(raw);
    if (element.getAttribute("title") !== next) element.setAttribute("title", next);
  }

  function gameMessage(original) {
    const keyMap = {
      "Nessun personaggio trovato": "noResults",
      "Affiliazione non nota": "unknownAffiliation",
      "Hai già provato questo personaggio.": "alreadyGuessed",
      "Scrivi un nome per iniziare.": "emptySearch",
      "Seleziona un personaggio dall’elenco dei suggerimenti.": "selectCharacter",
      "Seleziona un personaggio dall'elenco dei suggerimenti.": "selectCharacter",
      "Nessun personaggio disponibile.": "noCharacters",
      "🎉 Personaggio indovinato!": "winTitle",
      "Soluzione rivelata": "revealTitle",
    };
    if (keyMap[original]) return t(`naruto.game.${keyMap[original]}`, original);

    let match = original.match(/^(\d+) personaggi · Partite infinite · Nessun limite di tentativi$/);
    if (match) return format(t("naruto.game.intro", original), { total: match[1] });

    match = original.match(/^Tentativi: (\d+) · (\d+) personaggi ancora da provare$/);
    if (match) return format(t("naruto.game.attempts", original), { count: match[1], remaining: match[2] });

    match = original.match(/^Hai trovato (.+) in (\d+) tentativ[oi]!$/);
    if (match) return format(t("naruto.game.winText", original), { name: match[1], count: match[2] });

    match = original.match(/^Il personaggio segreto era (.+)\. Puoi ricominciare subito\.$/);
    if (match) return format(t("naruto.game.revealText", original), { name: match[1] });

    match = original.match(/^Impossibile caricare il dataset: (.*)$/);
    if (match) return format(t("naruto.game.loadError", original), { detail: match[1] });

    return original;
  }

  function translateRow(row) {
    const groupByColumn = {
      1: "gender",
      2: "affiliations",
      3: "jutsu",
      4: "kekkei",
      5: "nature",
      6: "attributes",
      7: "arc",
    };
    Array.from(row.cells).forEach((cell, index) => {
      const group = groupByColumn[index];
      if (!group) return; // Leave the character's name and portrait untouched.
      textNodes(cell, (original) => translatedValue(group, original), ".arrow,.nature-emoji");
      if (index === 5)
        cell.querySelectorAll(".nitem[title]").forEach((item) => {
          title(item, (raw) => translatedValue("nature", raw));
        });
      if (index === 7)
        cell.querySelectorAll(".arc-direction[title]").forEach((arrow) => {
          const localizeDirection = (raw) => {
            if (raw === "Soluzione in un arco successivo") return t("naruto.game.arcLater", raw);
            if (raw === "Soluzione in un arco precedente") return t("naruto.game.arcEarlier", raw);
            return raw;
          };
          title(arrow, localizeDirection);
          if (!originalAriaLabels.has(arrow)) {
            originalAriaLabels.set(arrow, arrow.getAttribute("aria-label"));
          }
          const rawAria = originalAriaLabels.get(arrow);
          if (rawAria) {
            const separator = " — ";
            const pos = rawAria.lastIndexOf(separator);
            if (pos >= 0) {
              const arcName = rawAria.slice(0, pos);
              const direction = rawAria.slice(pos + separator.length);
              arrow.setAttribute("aria-label", `${translatedValue("arc", arcName)} — ${localizeDirection(direction)}`);
            }
          }
        });
    });
  }

  function updateAudioLabel() {
    const button = byId("ambientToggle");
    const audio = byId("ambientAudio");
    if (!button || !audio) return;
    const key = audio.paused ? "audioOff" : "audioOn";
    const next = t(`naruto.page.${key}`, audio.paused ? "Attiva atmosfera" : "Disattiva atmosfera");
    button.setAttribute("aria-label", next);
    button.setAttribute("title", next);
  }

  function update() {
    byId("guessRows")?.querySelectorAll("tr").forEach(translateRow);

    // Only replace preview descriptions, never character names or input values.
    byId("matches")
      ?.querySelectorAll(".option .opt-sub")
      .forEach((element) => {
        textNodes(element, affiliationPreview);
      });
    byId("matches")
      ?.querySelectorAll(".option:not(button)")
      .forEach((element) => {
        textNodes(element, gameMessage);
      });
    ["message", "resultTitle", "resultText"].forEach((id) => {
      const element = byId(id);
      if (element) textNodes(element, gameMessage);
    });
    updateAudioLabel();
    updateHints();
  }

  function start() {
    let scheduled = false;
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      Promise.resolve().then(() => {
        scheduled = false;
        update();
      });
    };

    ["guessRows", "matches", "message", "resultTitle", "resultText"].forEach((id) => {
      const target = byId(id);
      if (target)
        new MutationObserver(schedule).observe(target, {
          childList: true,
          subtree: true,
          characterData: true,
        });
    });
    document.addEventListener("animedle:languagechange", schedule);
    ["play", "pause"].forEach((event) => byId("ambientAudio")?.addEventListener(event, schedule));
    schedule();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
