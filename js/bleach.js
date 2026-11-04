(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const labels = {
    gender: "Genere",
    height_cm: "Altezza",
    race: "Razza",
    profession: "Professione",
    location: "Luogo",
    affiliation: "Affiliazione",
    first_arc: "Primo arco",
  };
  const pool = [],
    used = new Set(),
    tried = new Set();
  let secret = null,
    win = false,
    shown = [],
    selected = null,
    choice = -1;

  // Multilingual presentation. All comparisons use the ORIGINAL characters.json.
  let messageState = null;
  let endingState = null;
  const fields = Object.keys(labels);

  function t(key, fallback = key) {
    const fullKey = `bleach.${key}`;
    const text = window.AnimedleI18n?.t(fullKey);
    return typeof text === "string" && text !== fullKey ? text : fallback;
  }
  function interpolate(template, values = {}) {
    return String(template).replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));
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
  function translatedValue(key, raw) {
    if (raw === null || raw === undefined || raw === "" || raw === "N/D") {
      return t("game.noData", "N/D");
    }
    if (Array.isArray(raw)) {
      return raw.length ? raw.map((v) => translatedValue(key, v)).join(", ") : t("game.noData", "N/D");
    }
    if (key === "height_cm") return `${raw} cm`;
    return t(`values.${key}.${valueKey(raw)}`, String(raw));
  }
  function attemptWord(count) {
    return t(count === 1 ? "game.attemptSingular" : "game.attemptPlural", count === 1 ? "tentativo" : "tentativi");
  }
  function refreshCount() {
    const count = tried.size;
    $("count").textContent = interpolate(t("game.attempts", "{count} {attemptWord}"), {
      count,
      attemptWord: attemptWord(count),
    });
  }

  function refreshEnding() {
    if (!endingState || !secret) return;
    const { revealed } = endingState;
    const title = revealed ? t("game.revealTitle", "Soluzione rivelata") : t("game.winTitle", "Hai indovinato!");
    const text = revealed ? t("game.revealText", "Il personaggio segreto era {name}. Puoi ricominciare subito.") : t("game.winText", "Il personaggio era {name}. Tentativi: {count}.");
    showResult(title, interpolate(text, { name: secret.name, count: tried.size }), revealed);
  }
  function setEnding(revealed = false) {
    endingState = { revealed };
    refreshEnding();
  }
  function updateAudioLabel() {
    const audio = $("ambientAudio"),
      button = $("ambientToggle");
    if (!audio || !button) return;
    const label = audio.paused ? t("page.audioOff", "Attiva atmosfera") : t("page.audioOn", "Disattiva atmosfera");
    button.setAttribute("aria-label", label);
    button.setAttribute("title", label);
  }
  function onLanguageChange() {
    // Update only the displayed clues, NOT the secret, attempted ids or scoring.
    const columns = fields;
    $("attempts")
      .querySelectorAll("tr[data-character-id]")
      .forEach((row) => {
        const character = pool.find((c) => String(c.id) === row.dataset.characterId);
        if (!character) return;
        columns.forEach((key, index) => {
          const copy = row.cells[index + 1]?.querySelector(".copy");
          if (copy) copy.textContent = translatedValue(key, character[key]);
        });
      });
    refreshCount();
    refreshEnding();
    if (!$("dropdown").hidden && $("search").value.trim()) showMatches();
    updateAudioLabel();
  }
  document.addEventListener("animedle:languagechange", onLanguageChange);
  ["play", "pause"].forEach((event) => $("ambientAudio")?.addEventListener(event, updateAudioLabel));
  updateAudioLabel();

  const norm = (s) =>
    (s || "")
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]/gu, "");
  const el = (tag, className, text) => {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (text !== undefined) e.textContent = text;
    return e;
  };
  const arr = (v) => (Array.isArray(v) ? v.filter(Boolean) : v === null || v === undefined || v === " " ? [] : [String(v)]);
  const known = (v) => v !== null && v !== undefined && (Array.isArray(v) ? v.length > 0 : String(v).trim() !== "" && v !== "N/D");
  const showResult = (title, text, revealed = false) => {
    const box = $("result");
    $("resultTitle").textContent = title;
    $("resultText").textContent = text;
    box.className = "result open" + (revealed ? " revealed" : "");
  };
  const safeMessage = (text, cls = "") => {
    const e = $("message");
    e.textContent = text;
    e.className = "message" + (cls ? " " + cls : "");
    e.style.display = text ? "" : "none";
  };
  const img = (url, alt) => {
    const e = el("img");
    e.src = url;
    e.alt = alt;
    e.loading = "lazy";
    e.referrerPolicy = "no-referrer";
    e.addEventListener("error", () => {
      const parent = e.parentElement;
      e.remove();
      if (parent && !parent.textContent.trim()) {
        const badge = el("span", parent.classList.contains("photo") ? "face-fallback" : "", alt.slice(0, 1).toUpperCase());
        parent.append(badge);
      }
    });
    return e;
  };
  const allMatches = (q) => {
    if (!q.trim()) return [];
    let n = norm(q);
    return pool
      .filter((c) => [c.name, ...(c.aliases || [])].some((x) => norm(x).includes(n)))
      .sort((a, b) => Number(norm(b.name).startsWith(n)) - Number(norm(a.name).startsWith(n)) || a.name.localeCompare(b.name))
      .slice(0, 12);
  };
  function toggleDropdown(open) {
    $("dropdown").hidden = !open;
    $("search").setAttribute("aria-expanded", String(open));
  }
  function showMatches() {
    const box = $("dropdown"),
      q = $("search").value;
    box.replaceChildren();
    shown = allMatches(q);
    choice = -1;
    if (!q.trim()) {
      toggleDropdown(false);
      return;
    }
    if (!shown.length) {
      box.append(el("div", "no-results", t("game.noResults", "Nessun personaggio trovato")));
      toggleDropdown(true);
      return;
    }
    for (let i = 0; i < shown.length; i++) {
      const c = shown[i],
        b = el("button", "option");
      b.type = "button";
      b.setAttribute("role", "option");
      let pic = el("span", "mini-place");
      if (c.image_url) pic.append(img(c.image_url, c.name));
      else pic.textContent = c.name.slice(0, 1);
      b.append(pic);
      const words = el("span", "option-txt");
      words.append(el("span", "option-name", c.name));
      words.append(el("div", "option-extra", c.source_category ? translatedValue("source_category", c.source_category) : "Bleach"));
      b.append(words);
      b.addEventListener("click", () => choose(c));
      box.append(b);
    }
    toggleDropdown(true);
  }
  function choose(c) {
    selected = c;
    $("search").value = c.name;
    toggleDropdown(false);
    $("search").focus();

    // Invia automaticamente il personaggio selezionato
    tryGuess();
  }
  function compare(c, key) {
    const sv = secret[key],
      cv = c[key];
    if (!known(cv) || !known(sv)) return { status: "unknown", direction: null };
    if (key === "height_cm" || key === "first_arc") {
      const other = key === "first_arc" ? secret.first_arc_order : sv;
      const now = key === "first_arc" ? c.first_arc_order : cv;
      if (now === null || other === null) return { status: "unknown", direction: null };
      return now === other ? { status: "ok", direction: null } : { status: "bad", direction: now < other ? "up" : "down" };
    }
    if (key === "gender") return { status: cv === sv ? "ok" : "bad", direction: null };
    const a = arr(cv),
      b = arr(sv),
      na = new Set(a.map(norm)),
      nb = new Set(b.map(norm));
    return na.size === nb.size && [...na].every((z) => nb.has(z)) ? { status: "ok", direction: null } : [...na].some((z) => nb.has(z)) ? { status: "partial", direction: null } : { status: "bad", direction: null };
  }
  function cell(c, key) {
    const v = c[key],
      s = compare(c, key),
      tile = el("div", "tile " + s.status + (s.direction ? " arrow-" + s.direction : ""));
    let value = translatedValue(key, v);
    const t = el("span", "copy", value);
    tile.append(t);
    const td = el("td");
    td.append(tile);
    return td;
  }
  function portrait(c) {
    const td = el("td"),
      tile = el("div", "tile portrait"),
      photo = el("div", "photo");
    if (c.image_url) photo.append(img(c.image_url, c.name));
    else photo.append(el("span", "face-fallback", (c.name || "?")[0]));
    tile.append(photo, el("span", "name", c.name));
    td.append(tile);
    return td;
  }
  function render(c) {
    const tbody = $("attempts");
    if (tbody.querySelector(".empty")) tbody.replaceChildren();
    const tr = el("tr");
    tr.dataset.characterId = String(c.id);
    tr.classList.add("riga-animata");
    tr.append(portrait(c));
    for (const key of Object.keys(labels)) tr.append(cell(c, key));
    tbody.prepend(tr);
  }
  function tryGuess() {
    if (!secret) {
      return;
    }
    if (win) {
      return;
    }
    let q = $("search").value.trim();
    let c = selected && norm(selected.name) === norm(q) ? selected : pool.find((z) => norm(z.name) === norm(q) || z.aliases?.some((a) => norm(a) === norm(q)));
    if (!c) {
      const m = allMatches(q);
      if (m.length === 1) c = m[0];
    }
    if (!c) {
      showMatches();
      return;
    }
    if (tried.has(c.id)) {
      return;
    }
    tried.add(c.id);
    render(c);
    refreshCount();
    $("search").value = "";
    selected = null;
    toggleDropdown(false);
    if (c.id === secret.id) {
      win = true;
      $("try").disabled = true;
      setEnding(false);
    }
  }
  function begin() {
    if (!pool.length) return;
    const available = pool.filter((c) => c.eligible_target);
    if (!available.length) {
      return;
    }
    if (used.size >= available.length) used.clear();
    const left = available.filter((c) => !used.has(c.id));
    secret = left[Math.floor(Math.random() * left.length)];
    used.add(secret.id);
    tried.clear();
    win = false;
    selected = null;
    $("attempts").replaceChildren();
    const tr = el("tr");
    const empty = el("td", "empty", "");
    empty.colSpan = 8;
    tr.append(empty);
    $("attempts").append(tr);
    $("result").className = "result";
    endingState = null;
    $("search").value = "";
    $("search").disabled = false;
    $("try").disabled = false;
    $("reveal").disabled = false;
    refreshCount();
    toggleDropdown(false);
  }
  $("guess-form").addEventListener("submit", (e) => {
    e.preventDefault();
    tryGuess();
  });
  $("search").addEventListener("input", () => {
    selected = null;
    showMatches();
  });
  $("search").addEventListener("keydown", (e) => {
    if ($("dropdown").hidden) return;
    if (e.key === "Escape") {
      toggleDropdown(false);
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!shown.length) return;
      choice = (choice + (e.key === "ArrowDown" ? 1 : -1) + shown.length) % shown.length;
      Array.from($("dropdown").children).forEach((z, i) => z.classList.toggle("active", i === choice));
      return;
    }
    if (e.key === "Enter" && choice >= 0) {
      e.preventDefault();
      choose(shown[choice]);
      return;
    }
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".input-wrap")) toggleDropdown(false);
  });
  $("new").addEventListener("click", begin);
  $("again").addEventListener("click", begin);
  $("reveal").addEventListener("click", () => {
    if (!secret) return;
    if (!tried.has(secret.id)) {
      tried.add(secret.id);
      render(secret);
    }
    win = true;
    $("try").disabled = true;
    setEnding(true);
  });
  fetch("./characters.json", { cache: "no-store" })
    .then((r) => {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    })
    .then((data) => {
      if (!Array.isArray(data) || data.length === 0) throw Error("Dataset vuoto o malformato");
      for (const c of data) {
        if (c && c.id && c.name) pool.push(c);
      }
      pool.sort((a, b) => a.name.localeCompare(b.name));
      begin();
    })
    .catch((e) => {
      console.error("Errore caricamento Bleachdle", e);
      $("try").disabled = true;
      $("new").disabled = true;
      $("reveal").disabled = true;
      $("count").textContent = t("game.datasetError", "Errore dataset");
    });
})();
